---
"mixlab-oidc-next": minor
---

# mixlab-oidc-next v0.1.0

首个公开版本。Poll Pink 生产验证的 MixLab OIDC 登录流程封装为可复用 SDK。

## Features

- **`MixLab()` NextAuth v5 Provider**（主路径）—— 4 行接入
- **`createMixLabClient()` 独立 server client**（备用路径）—— 不用 NextAuth 也能用
- **`createAuthProxy()` middleware/proxy helper** —— 1 行全局登录保护
- **`sanitizeReturnTo()` open redirect 防护**
- **CLI 工具**：`init`（scaffold）+ `doctor`（env 体检）

## 双层 API

```bash
npm install mixlab-oidc-next
```

路径 A（NextAuth v5）：
```ts
// auth.ts
import { MixLab } from "mixlab-oidc-next/provider";
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [MixLab({ clientId: process.env.MIXLAB_CLIENT_ID! })],
});
```

路径 B（独立）：
```ts
import { createMixLabClient } from "mixlab-oidc-next/server";
const client = createMixLabClient({ /* ... */ });
export const GET = (req) => client.handlers.login(req);
```

## 保留的安全决策（来自 Poll Pink v2）

- 回调必须 Route Handler（RSC 14.x 不能写 cookie，session.save() 静默失败）
- nonce 严格校验（不留宽容分支 —— 抗重放双保险）
- `returnTo` 必须 `/` 开头、不能 `//`（防 open redirect）
- `redirect_uri` 从 `baseUrl` 拼，不从 host header 推断
- module-level fail-fast（避免冷启动 race condition）
- 10min in-memory discovery cache + jose JWKS cache（Serverless 友好）

## 兼容性

- Next.js 14 / 15 / 16
- NextAuth v5 (beta)
- Node ≥ 18.18
- React 18 / 19

## 文档

完整文档：https://github.com/shadowcz007/mixlab-oidc-next/tree/main/docs

## 完整变更日志

参见 [CHANGELOG.md](https://github.com/shadowcz007/mixlab-oidc-next/releases)