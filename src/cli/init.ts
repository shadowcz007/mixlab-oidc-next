import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ============================================================
// mixlab-oidc-next init —— 在 Next.js 项目里 scaffold 文件
//
// v0.1.4 重大更新：从 Path A(NextAuth v5)模板改为 Path B(iron-session)
// 原因：2026-07-11 mixlab-home 接入实测,Path A 在 Vercel 生产有 2 个
// 已知坑(详见 README §0 踩坑故事)。Path B 是 pollpink 2026-06
// 上线零事故的生产验证路径。
//
// 写 7 个文件（flag:"wx" 避免覆盖已有文件）：
//   1. .env.example                              —— MixLab OIDC env vars
//   2. src/lib/auth/mixlab-client.ts             —— SDK 单例
//   3. src/lib/auth/session.ts                   —— getSession() helper
//   4. src/app/api/auth/login/route.ts            —— 发起 OIDC
//   5. src/app/api/auth/callback/route.ts         —— IdP 回调
//   6. src/app/api/auth/logout/route.ts           —— 登出
//   7. src/app/signin/page.tsx                   —— 公共登录入口
//
// 不带 --force 时若文件已存在会报错退出，提示用户用 --force 覆盖
// ============================================================

const ENV_EXAMPLE = `# MixLab OIDC（v0.1.4 SDK）—— Path B 配置

# OIDC issuer URL（默认 MixLab 官方，可改为自建 IdP）
MIXLAB_ISSUER=https://www.mixlab.top

# 在 MixLab 后台申请的 public client ID（无 secret）
MIXLAB_CLIENT_ID=

# 应用 base URL（必须与 MixLab 后台注册的 redirect_uri 一致）
# 部署到 Vercel 时改成 https://your-app.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# iron-session 加密密码（≥32 字符；生成：openssl rand -base64 32）
# 注意：build 时也要有,否则 build 会 fail-fast
SESSION_PASSWORD=
`;

const MIXLAB_CLIENT_TS = `// src/lib/auth/mixlab-client.ts
// MixLab OIDC client 单例(Path B)
//
// 安装:npm install mixlab-oidc-next iron-session jose
// 文档:https://github.com/shadowcz007/mixlab-oidc-next#0-推荐path-biron-session

import { createMixLabClient, type MixLabClient } from "mixlab-oidc-next/server";

declare global {
  // eslint-disable-next-line no-var
  var __mixlabClient: MixLabClient | undefined;
}

function buildClient(): MixLabClient {
  return createMixLabClient({
    issuer:       process.env.MIXLAB_ISSUER!,
    clientId:     process.env.MIXLAB_CLIENT_ID!,
    baseUrl:      process.env.NEXT_PUBLIC_BASE_URL!,
    redirectPath: "/api/auth/callback",  // 与 OIDC 后台注册一致
    scopes:       ["openid", "profile", "email"],
    session: {
      password: process.env.SESSION_PASSWORD!,
    },
  });
}

// HMR 不重复创建（复用 SDK 的 in-memory cache：discovery / JWKS）
export const mixlabClient: MixLabClient =
  globalThis.__mixlabClient ?? (globalThis.__mixlabClient = buildClient());
`;

const SESSION_TS = `// src/lib/auth/session.ts
// 读 mixlab-session cookie(SDK 写入的 iron-session)
//
// 用法:
//   const session = await getSession();
//   if (session.user) console.log(session.user.sub, session.user.email);

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  user?: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  // SDK 内部用的 OIDC 临时态
  oauthState?: string;
  oauthNonce?: string;
  oauthCodeVerifier?: string;
  returnTo?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!,
  cookieName: "mixlab-session",  // 与 SDK 默认值一致
  cookieOptions: {
    secure:   process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
`;

const LOGIN_ROUTE = `// src/app/api/auth/login/route.ts
// 发起 OIDC 授权码流程
// 用户点登录按钮 → form POST 到这里 → SDK 生成 state/nonce/PKCE →
// 写临时 session cookie → 302 跳 IdP authorize

import { mixlabClient } from "@/lib/auth/mixlab-client";

export const GET  = (req: Request) => mixlabClient.handlers.login(req);
export const POST = (req: Request) => mixlabClient.handlers.login(req);
`;

const CALLBACK_ROUTE = `// src/app/api/auth/callback/route.ts
// IdP 授权后的回调
// SDK 在这里:
//   1. 校验 state(防 CSRF)
//   2. code → token 交换
//   3. jose 验签 id_token(iss + aud + nonce 严格)
//   4. 写 user 到 mixlab-session cookie
//   5. 302 跳 returnTo

import { mixlabClient } from "@/lib/auth/mixlab-client";

export const GET = (req: Request) => mixlabClient.handlers.callback(req);
`;

const LOGOUT_ROUTE = `// src/app/api/auth/logout/route.ts
// 登出:清 mixlab-session cookie,302 跳首页
//
// 注:AgentLink 无 end_session_endpoint(无 RP-Initiated Logout),
// 只能清本地 session;用户在 mixlab.top 仍处登录态(access token 30 天有效)

import { mixlabClient } from "@/lib/auth/mixlab-client";

export const POST = (req: Request) => mixlabClient.handlers.logout(req);
`;

const SIGNIN_PAGE = `// src/app/signin/page.tsx
// 公共登录入口:form 直接 POST 到 /api/auth/login(SDK handler)
// 模式参考 mixlab-oidc-next examples/app-router

type SearchParams = Promise<{ returnTo?: string }>;

export default async function SignInPage(props: { searchParams: SearchParams }) {
  const { returnTo = "/" } = await props.searchParams;
  // 防 open redirect:returnTo 必须 / 开头且不是 // 协议相对 URL
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\\\")
      ? returnTo
      : "/";

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form action="/api/auth/login" method="POST">
        <input type="hidden" name="returnTo" value={safeReturnTo} />
        <button type="submit" style={{ padding: "12px 24px", cursor: "pointer" }}>
          用 mixlab 登录
        </button>
      </form>
    </main>
  );
}
`;

export interface InitOptions {
  force?: boolean;
}

export function init(opts: InitOptions = {}): void {
  const root = process.cwd();
  if (!existsSync(resolve(root, "package.json"))) {
    console.error("Error: package.json not found in current directory.");
    console.error("Run this command inside your Next.js project root.");
    process.exit(1);
  }

  const files: Array<{ path: string; content: string; description: string }> = [
    {
      path: ".env.example",
      content: ENV_EXAMPLE,
      description: "MixLab OIDC env vars (Path B 配置)",
    },
    {
      path: "src/lib/auth/mixlab-client.ts",
      content: MIXLAB_CLIENT_TS,
      description: "SDK 单例(createMixLabClient)",
    },
    {
      path: "src/lib/auth/session.ts",
      content: SESSION_TS,
      description: "getSession() helper(读 mixlab-session cookie)",
    },
    {
      path: "src/app/api/auth/login/route.ts",
      content: LOGIN_ROUTE,
      description: "GET/POST 发起 OIDC 授权码流程",
    },
    {
      path: "src/app/api/auth/callback/route.ts",
      content: CALLBACK_ROUTE,
      description: "GET 接收 IdP 回调、验签 id_token、写 user",
    },
    {
      path: "src/app/api/auth/logout/route.ts",
      content: LOGOUT_ROUTE,
      description: "POST 登出(清 cookie)",
    },
    {
      path: "src/app/signin/page.tsx",
      content: SIGNIN_PAGE,
      description: "公共登录入口(form POST 到 /api/auth/login)",
    },
  ];

  let written = 0;
  let skipped = 0;
  const skippedFiles: string[] = [];

  for (const f of files) {
    const fullPath = resolve(root, f.path);
    if (existsSync(fullPath) && !opts.force) {
      skipped++;
      skippedFiles.push(f.path);
      continue;
    }
    writeFileSync(fullPath, f.content);
    written++;
    console.log(`✓ ${f.path}`);
  }

  console.log(`\nDone: ${written} written, ${skipped} skipped.`);
  if (skippedFiles.length > 0) {
    console.log(
      `\nSkipped (already exist): ${skippedFiles.join(", ")}\nRun with --force to overwrite.`
    );
  }

  if (written > 0) {
    console.log("\nNext steps:");
    console.log("  1. cp .env.example .env.local");
    console.log("  2. Fill in MIXLAB_CLIENT_ID + SESSION_PASSWORD");
    console.log("     (生成 SESSION_PASSWORD: openssl rand -base64 32)");
    console.log("  3. 在 MixLab 后台「设置 → 应用接入」注册 redirect_uri:");
    console.log("     http://localhost:3000/api/auth/callback");
    console.log("  4. npm install mixlab-oidc-next iron-session jose");
    console.log("  5. npm run dev");
    console.log("  6. 打开 http://localhost:3000/signin");
  }
}
