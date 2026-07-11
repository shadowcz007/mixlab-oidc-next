import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ============================================================
// mixlab-oidc-next init —— 在 Next.js 项目里 scaffold 文件
//
// 写 4 个文件（flag:"wx" 避免覆盖已有文件）：
//   1. .env.example   —— MixLab OIDC env vars
//   2. auth.ts        —— NextAuth v5 配置（路径 A 入口）
//   3. app/api/auth/[...nextauth]/route.ts —— 挂载 handlers
//   4. proxy.ts       —— 全局登录保护（Next 16+ 文件名）
//                      用户可手动改名为 middleware.ts（Next 14/15）
//
// 不带 --yes 时若文件已存在会报错退出，提示用户用 --force 覆盖
// ============================================================

const ENV_EXAMPLE = `# MixLab OIDC（v0.1 SDK）
# Issuer URL（默认 MixLab 官方，可改为自建 IdP）
MIXLAB_ISSUER=https://www.mixlab.top

# 在 MixLab 后台申请的 public client ID（无 secret）
MIXLAB_CLIENT_ID=

# 应用 base URL（必须与 MixLab 后台注册的 redirect_uri 一致）
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# iron-session 加密密钥（≥32 字符；生成：openssl rand -base64 32）
SESSION_PASSWORD=

# NextAuth v5 加密密钥（≥32 字符；与 SESSION_PASSWORD 不同）
AUTH_SECRET=
`;

const AUTH_TS = `import NextAuth from "next-auth";
import { MixLab } from "mixlab-oidc-next/provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MixLab({
      clientId: process.env.MIXLAB_CLIENT_ID!,
      // 自建 IdP 时覆盖：
      // issuer: process.env.MIXLAB_ISSUER,
      // scope: ["openid", "profile", "email"],
    }),
  ],
});
`;

const HANDLERS_ROUTE = `import { handlers } from "@/auth";
export const { GET, POST } = handlers;
`;

const PROXY_TS = `// Next.js 16+ 用 proxy.ts；Next.js 14/15 改名为 middleware.ts
import { createAuthProxy } from "mixlab-oidc-next/proxy";

export default createAuthProxy({
  publicPaths: ["/api/auth/", "/_next/", "/favicon.ico"],
});
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
      description: "MixLab OIDC env vars (copy to .env.local)",
    },
    {
      path: "auth.ts",
      content: AUTH_TS,
      description: "NextAuth v5 config with MixLab provider",
    },
    {
      path: "app/api/auth/[...nextauth]/route.ts",
      content: HANDLERS_ROUTE,
      description: "NextAuth route handler",
    },
    {
      path: "proxy.ts",
      content: PROXY_TS,
      description: "Global login protection (Next 16+ proxy / rename to middleware.ts for ≤15)",
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
    console.log("  2. Fill in MIXLAB_CLIENT_ID + SESSION_PASSWORD + AUTH_SECRET");
    console.log("  3. npm install mixlab-oidc-next");
    console.log("  4. npm run dev");
    console.log("\nFor Next 14/15: rename proxy.ts → middleware.ts");
  }
}