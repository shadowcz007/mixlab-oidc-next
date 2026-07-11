// Next.js 16+: 文件名 proxy.ts
// Next.js 14/15: 改名为 middleware.ts，函数体不变
import { createAuthProxy } from "mixlab-oidc-next/proxy";

export default createAuthProxy({
  publicPaths: ["/api/auth/", "/_next/", "/favicon.ico"],
});