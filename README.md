# mixlab-oidc-next

> MixLab OIDC SDK for Next.js — login in 10 minutes.

为 Next.js 项目提供 MixLab OIDC 登录，基于 [Poll Pink](https://github.com/shadowcz007/pollpink) 生产验证的登录流程（2026-06 上线，零事故运行至今）。

## 安装

```bash
npm install mixlab-oidc-next next-auth@beta
```

> `next-auth@beta` 是 peer dependency，路径 A 必须装。

## 10 分钟跑通

```bash
# 1. scaffold 文件（写 4 个，不覆盖已有）
npx mixlab-oidc-next init

# 2. 填环境变量
cp .env.example .env.local
# 编辑 .env.local：
#   MIXLAB_ISSUER=https://www.mixlab.top
#   MIXLAB_CLIENT_ID=<从 MixLab 后台拿>
#   AUTH_SECRET=<openssl rand -base64 32>

# 3. 体检
npx mixlab-oidc-next doctor

# 4. 启动
npm run dev
```

打开 `http://localhost:3000`，点 "Sign in with MixLab"，完成登录。

## API

### 路径 A · NextAuth v5（推荐）

```ts
// auth.ts
import NextAuth from "next-auth";
import { MixLab } from "mixlab-oidc-next/provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MixLab({ clientId: process.env.MIXLAB_CLIENT_ID! })],
});
```

```ts
// app/api/auth/[...nextauth]/route.ts (App Router 15+)
// pages/api/auth/[...nextauth].ts (Pages Router 14)
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

在 RSC / Server Action 里直接用：

```tsx
import { auth, signIn, signOut } from "@/auth";

export default async function Page() {
  const session = await auth();
  return session ? <p>Hi {session.user.name}</p> : <p>Not signed in</p>;
}
```

### 路径 B · 独立 Server Client（不用 NextAuth）

```ts
// app/api/auth/login/route.ts
import { createMixLabClient } from "mixlab-oidc-next/server";

const client = createMixLabClient({
  issuer: process.env.MIXLAB_ISSUER!,
  clientId: process.env.MIXLAB_CLIENT_ID!,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
  session: { password: process.env.SESSION_PASSWORD! },
});

export const GET = (req: Request) => client.handlers.login(req);
export const GET = (req: Request) => client.handlers.callback(req); // 默认 /login
export const POST = (req: Request) => client.handlers.logout(req);
export const GET = () => client.handlers.me();
```

### 全局登录保护（middleware/proxy helper）

```ts
// proxy.ts (Next.js 16+) 或 middleware.ts (Next.js 14/15)
import { createAuthProxy } from "mixlab-oidc-next/proxy";

export default createAuthProxy({
  publicPaths: ["/api/auth/", "/_next/", "/favicon.ico"],
});
```

## 环境变量

| 变量 | 说明 | 必填 | 用于 |
|---|---|---|---|
| `MIXLAB_ISSUER` | OIDC issuer URL（默认 `https://www.mixlab.top`） | ✅ | 两路径 |
| `MIXLAB_CLIENT_ID` | MixLab 后台申请的 public client ID | ✅ | 两路径 |
| `NEXT_PUBLIC_BASE_URL` | 应用 base URL（必须与 MixLab 后台注册的 redirect_uri 一致） | ✅ | 两路径 |
| `AUTH_SECRET` | NextAuth session 加密密钥（≥ 32 字符） | ✅ | 路径 A |
| `SESSION_PASSWORD` | iron-session 加密密码（≥ 32 字符） | ✅ | 路径 B |

> 生成密钥：`openssl rand -base64 32`

## 兼容性

| 框架 | 版本 |
|---|---|
| Next.js | 14 / 15 / 16 |
| next-auth | v5 beta（路径 A） |
| React | 18 / 19 |
| Node.js | ≥ 18.18 |

## 安全设计（保留自 Poll Pink v2）

- ✅ 回调必须 Route Handler（RSC 14.x 不能写 cookie，`session.save()` 会静默失败）
- ✅ nonce 严格校验（不留宽容分支 —— 抗重放双保险）
- ✅ `returnTo` 必须 `/` 开头、不能 `//`（防 open redirect）
- ✅ `redirect_uri` 从 `baseUrl` 拼，**禁止从 host header 推断**
- ✅ module-level fail-fast（避免冷启动 race condition）
- ✅ 10min in-memory discovery cache + jose JWKS cache（Serverless 友好）

## 文档

完整文档见 [docs/](docs/pages/_app.mdx)：

- [Getting Started](docs/pages/getting-started.mdx) — 10 分钟跑通
- [API Reference](docs/pages/api-reference.mdx) — 完整签名 + 用法
- [App Router Guide](docs/pages/guides/app-router.mdx) — RSC + Server Action
- [Pages Router Guide](docs/pages/guides/pages-router.mdx) — getServerSideProps + useSession
- [proxy / middleware](docs/pages/guides/proxy.mdx) — 全局登录保护

## 完整示例项目

- [examples/app-router](examples/app-router/) — Next.js 15 + NextAuth v5
- [examples/pages-router](examples/pages-router/) — Next.js 14 + NextAuth v5

## CLI

```bash
npx mixlab-oidc-next init [--force]   # scaffold 4 个文件
npx mixlab-oidc-next doctor           # 体检 6 项 env
```

## License

MIT © [shadowcz007](https://github.com/shadowcz007)

## 相关项目

- [Poll Pink](https://github.com/shadowcz007/pollpink) — 生产验证 SDK 的来源项目
- [MixLab](https://www.mixlab.top) — OIDC provider