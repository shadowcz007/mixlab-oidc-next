# mixlab-oidc-next

> MixLab OIDC SDK for Next.js — login in 10 minutes.

为 Next.js 项目提供 MixLab OIDC 登录，基于 [Poll Pink](https://github.com/shadowcz007/pollpink) 生产验证的登录流程（2026-06 上线，零事故运行至今）。

## 安装

```bash
npm install mixlab-oidc-next
```

> **不再需要装 `next-auth`**。官方推荐 Path B(iron-session + 4 个 Route Handler),
> 仅在用 NextAuth v5 集成时才需要 `npm install next-auth@beta`(但有已知坑,见 §0)。

## 10 分钟跑通

```bash
# 1. scaffold 文件(Path B 模板,不覆盖已有)
npx mixlab-oidc-next init

# 2. 填环境变量
cp .env.example .env.local
# 编辑 .env.local:
#   MIXLAB_ISSUER=https://www.mixlab.top
#   MIXLAB_CLIENT_ID=<从 MixLab 后台拿>
#   NEXT_PUBLIC_BASE_URL=http://localhost:3000
#   SESSION_PASSWORD=<openssl rand -base64 32>

# 3. 体检
npx mixlab-oidc-next doctor

# 4. 启动
npm run dev
```

打开 `http://localhost:3000`，点 "Sign in with MixLab"，完成登录。

---

## 0. 推荐:Path B(iron-session)

> **为什么不是 NextAuth**:NextAuth v5 + MixLab Provider 在 Vercel 生产环境
> 有 2 个已知坑(authorize URL 默认缺 state/nonce;Provider cast `unknown`
> 在 build minify 后行为未定义)。mixlab-home 2026-07-11 接入实测踩过
> 4 轮 debug 才切到 Path B。**生产稳定优先 → 用 Path B**。
> 完整 post-mortem:
> [mixlab-home docs/AUTH-INCIDENT-2026-07-11.md](https://github.com/shadowcz007/mixlab-home/blob/main/docs/AUTH-INCIDENT-2026-07-11.md)

```ts
// src/lib/auth/mixlab-client.ts — SDK 单例
import { createMixLabClient } from "mixlab-oidc-next/server";

export const mixlabClient = createMixLabClient({
  issuer:       process.env.MIXLAB_ISSUER!,        // 如 https://www.mixlab.top
  clientId:     process.env.MIXLAB_CLIENT_ID!,     // 注册应用时拿到的 cid_xxx
  baseUrl:      process.env.NEXT_PUBLIC_BASE_URL!, // 如 https://your-app.com
  redirectPath: "/api/auth/callback",             // 与 OIDC 后台注册的回调地址一致
  scopes:       ["openid", "profile", "email"],
  session: {
    password: process.env.SESSION_PASSWORD!,       // openssl rand -base64 32
  },
});
```

```ts
// src/app/api/auth/login/route.ts — 发起 OIDC
import { mixlabClient } from "@/lib/auth/mixlab-client";
export const GET  = (req: Request) => mixlabClient.handlers.login(req);
export const POST = (req: Request) => mixlabClient.handlers.login(req);
```

```ts
// src/app/api/auth/callback/route.ts — IdP 回调
import { mixlabClient } from "@/lib/auth/mixlab-client";
export const GET = (req: Request) => mixlabClient.handlers.callback(req);
```

```ts
// src/app/api/auth/logout/route.ts — 登出
import { mixlabClient } from "@/lib/auth/mixlab-client";
export const POST = (req: Request) => mixlabClient.handlers.logout(req);
```

```ts
// src/lib/auth/session.ts — 读 session
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export async function getSession() {
  return getIronSession(await cookies(), {
    password:   process.env.SESSION_PASSWORD!,
    cookieName: "mixlab-session",
    cookieOptions: {
      secure:   process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path:     "/",
    },
  });
}
```

```bash
# .env.local(必填 4 项)
MIXLAB_ISSUER=https://www.mixlab.top
MIXLAB_CLIENT_ID=<your-cid>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SESSION_PASSWORD=$(openssl rand -base64 32)
```

```tsx
// src/app/signin/page.tsx — 登录按钮(form POST 到 SDK handler)
<form action="/api/auth/login" method="POST">
  <input type="hidden" name="returnTo" value="/" />
  <button type="submit">用 mixlab 登录</button>
</form>
```

### Path B 优势
- ✅ **生产验证过**:pollpink 2026-06 上线,零事故运行至今
- ✅ **行为可预测**:自己写 4 个 handler,SDK 内部做什么一目了然
- ✅ **不依赖未稳定框架**:iron-session 8.x + jose 5.x 都是 stable release
- ✅ **不踩 NextAuth v5 OIDC 坑**:见末尾踩坑故事

### Path B 注意点
- ⚠️ SESSION_PASSWORD 必填,≥ 32 字符,build 时也要(env 不存在 build 会 fail-fast)
- ⚠️ redirect_uri 必须在 OIDC 后台「设置 → 应用接入」逐行注册,协议+域名+路径+端口都一字不差
- ⚠️ production 环境的 NEXT_PUBLIC_BASE_URL 须是 https://(build 时拼 redirect_uri)

---

## 备选:Path A(NextAuth v5)

> 快速原型可尝试,生产环境请用 Path B。已知 1 个问题已经在 SDK v0.1.4 修复。

```bash
npm install mixlab-oidc-next next-auth@beta
```

```ts
// auth.ts
import NextAuth from "next-auth";
import { MixLab } from "mixlab-oidc-next/provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MixLab({
    clientId: process.env.MIXLAB_CLIENT_ID!,
    issuer:   process.env.MIXLAB_ISSUER!,
    id: "mixlab",
    // SDK 0.1.4+ 内部已显式设 checks:['pkce','state','nonce']
    // 不需要在这里重复设
  })],
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth";
```

```bash
# .env.local
MIXLAB_ISSUER=https://www.mixlab.top
MIXLAB_CLIENT_ID=<your-cid>
AUTH_SECRET=$(openssl rand -base64 32)
```

> **Path A 已知问题(SDK 0.1.4 已修)**:
> 1. ~~NextAuth v5 的 OIDC provider 默认 `checks = ["pkce"]`~~ → 已在 0.1.4 修复(SDK 工厂显式设 `["pkce","state","nonce"]`)
> 2. Provider cast `unknown` 在 Vercel build minify 后行为未定义 → mixlab-home 2026-07-11 实测需绕过 SDK 直配才稳定
>
> 等 mixlab-oidc-next 进一步把工厂返回类型从 `unknown` 改为 `OIDCConfig<Profile>` 后再用 Path A。

---

## 全局登录保护(middleware/proxy helper)

> ⚠️ `createAuthProxy` 只检 cookie 存在,不验签内容。**不能**用它做 admin 授权。
> admin 授权请在 route handler 内用 `getCurrentUser()` 查 role。

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
| `MIXLAB_ISSUER` | OIDC issuer URL(默认 `https://www.mixlab.top`) | ✅ | 两路径 |
| `MIXLAB_CLIENT_ID` | MixLab 后台申请的 public client ID | ✅ | 两路径 |
| `NEXT_PUBLIC_BASE_URL` | 应用 base URL(必须与 MixLab 后台注册的 redirect_uri 一致) | ✅ | 两路径 |
| `SESSION_PASSWORD` | iron-session 加密密码(≥ 32 字符) | ✅(Path B) | Path B |
| `AUTH_SECRET` | NextAuth session 加密密钥(≥ 32 字符) | ✅(Path A) | Path A |

> 生成密钥:`openssl rand -base64 32`

## 兼容性

| 框架 | 版本 | 路径 |
|---|---|---|
| Next.js | 14 / 15 / 16 | 全部 |
| React | 18 / 19 | 全部 |
| Node.js | ≥ 18.18 | 全部 |
| iron-session | ^8.0.4 | Path B |
| jose | ^5.9.6 | 全部(SDK peer dep) |
| next-auth | v5 beta(可选) | Path A 才装 |

## 安全设计(保留自 Poll Pink v2)

- ✅ 回调必须 Route Handler(RSC 14.x 不能写 cookie,`session.save()` 会静默失败)
- ✅ nonce 严格校验(不留宽容分支 —— 抗重放双保险)
- ✅ `returnTo` 必须 `/` 开头、不能 `//`(防 open redirect)
- ✅ `redirect_uri` 从 `baseUrl` 拼,**禁止从 host header 推断**
- ✅ module-level fail-fast(避免冷启动 race condition)
- ✅ 10min in-memory discovery cache + jose JWKS cache(Serverless 友好)
- ✅ ★ SDK 0.1.4+ 显式设 checks:['pkce','state','nonce'](Path A 必备)

## 踩坑故事(2026-07-11 mixlab-home 实测)

mixlab-home 用 Path A 接入时踩了 4 轮坑,总耗时 6.5 小时才切到 Path B 跑通。

| 轮 | 症状 | 误判 | 真因 |
| --- | --- | --- | --- |
| 1 | `error=Configuration` 500 | NextAuth 配置错 | 生产 DB 缺 `MemberOidcIdentity` 表 |
| 2 | `InvalidCheck: pkceCodeVerifier` | SDK bug | 浏览器残留上次失败 deploy 的过期 cookie |
| 3 | `invalid_request: "缺少 client_id"` | 后台/env/SDK 丢字段 | NextAuth v5 默认 `checks=["pkce"]` 缺 state/nonce |
| 4 | 同 3,即使手动加 checks 仍报 | 没救了 | 改用 Path B,5 分钟跑通 |

**经验**:
- IdP 错误信息不一定精准 → **DevTools 截真实 authorize URL**
- 生产验证过的路径优先 → **别在陌生 SDK + 不熟框架上花超 1 小时**
- NextAuth v5 + 新 OIDC provider 的组合未充分验证 → **生产环境优先 Path B**

完整 post-mortem:[mixlab-home docs/AUTH-INCIDENT-2026-07-11.md](https://github.com/shadowcz007/mixlab-home/blob/main/docs/AUTH-INCIDENT-2026-07-11.md)

## 文档

完整文档见 [docs/](docs/pages/_app.mdx):

- [Getting Started](docs/pages/getting-started.mdx) — 10 分钟跑通
- [API Reference](docs/pages/api-reference.mdx) — 完整签名 + 用法
- [App Router Guide](docs/pages/guides/app-router.mdx) — RSC + Server Action
- [Pages Router Guide](docs/pages/guides/pages-router.mdx) — getServerSideProps + useSession
- [proxy / middleware](docs/pages/guides/proxy.mdx) — 全局登录保护

## 完整示例项目

- [examples/app-router](examples/app-router/) — Next.js 15 + **Path B**(iron-session)
- [examples/pages-router](examples/pages-router/) — Next.js 14 + **Path B**(iron-session)

## CLI

```bash
npx mixlab-oidc-next init [--force]   # scaffold Path B 的 6 个文件
npx mixlab-oidc-next doctor           # 体检 6 项 env
```

## License

MIT © [shadowcz007](https://github.com/shadowcz007)

## 相关项目

- [Poll Pink](https://github.com/shadowcz007/pollpink) — 生产验证 SDK 的来源项目(2026-06 上线)
- [MixLab](https://www.mixlab.top) — OIDC provider
- [AgentLink](https://github.com/shadowcz007/AgentLink) — MixLab 的 OIDC IdP 本身
- [mixlab-home](https://github.com/shadowcz007/mixlab-home) — 本 SDK 接入实战
