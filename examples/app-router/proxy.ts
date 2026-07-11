// examples/app-router/proxy.ts
// 全局登录保护:Next.js 16+ 用 proxy.ts,14/15 改名为 middleware.ts
// ⚠️ createAuthProxy 只检 cookie 存在,不做鉴权。
// admin 授权请在 route handler / page 内自己用 getSession() 查 role。

import { createAuthProxy } from "mixlab-oidc-next/proxy";

export default createAuthProxy({
  publicPaths: ["/api/auth/", "/_next/", "/favicon.ico"],
});
