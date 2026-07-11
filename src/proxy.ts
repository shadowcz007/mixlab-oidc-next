import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ============================================================
// createAuthProxy — Next.js 中间件 helper（v16 proxy / v14-15 middleware）
//
// 用法：
//   // Next.js 14/15: 文件名 middleware.ts
//   // Next.js 16+:   文件名 proxy.ts（middleware.ts 已废弃）
//   import { createAuthProxy } from "mixlab-oidc-next/proxy";
//   export default createAuthProxy({ publicPaths: ["/api/auth/", "/_next/"] });
//
// 行为：
//   - publicPaths 匹配 → 放行
//   - 有 session cookie → 放行
//   - 否则 → 跳 loginPath?returnTo=<原始 URL>
//
// 注意：
//   - v16 默认 Node runtime，可用 node:crypto / Buffer
//   - v14/v15 默认 Edge runtime，限制更多（无 Buffer）—— 我们只读 cookie，OK
//   - 不要在 proxy 里做"唯一"鉴权，必须每个 Server Action / Route Handler
//     单独 await auth() 校验（Next.js 官方建议）
// ============================================================

export interface AuthProxyOptions {
  /** 不需要登录的路径前缀白名单 */
  publicPaths?: string[];
  /** session cookie 名，默认 "mixlab-session" */
  cookieName?: string;
  /** 未登录时跳的路径，默认 "/login" */
  loginPath?: string;
}

const DEFAULT_PUBLIC_PATHS = ["/api/auth/", "/_next/", "/favicon.ico"];
const DEFAULT_COOKIE_NAME = "mixlab-session";
const DEFAULT_LOGIN_PATH = "/login";

export function createAuthProxy(opts: AuthProxyOptions = {}) {
  const publicPaths = opts.publicPaths ?? DEFAULT_PUBLIC_PATHS;
  const cookieName = opts.cookieName ?? DEFAULT_COOKIE_NAME;
  const loginPath = opts.loginPath ?? DEFAULT_LOGIN_PATH;

  return function proxy(req: NextRequest): NextResponse {
    const { pathname } = req.nextUrl;
    const search = req.nextUrl.search ?? "";

    // 白名单路径 → 放行
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // 有 session cookie → 放行（不校验内容，避免 Edge runtime 限制）
    if (req.cookies.has(cookieName)) {
      return NextResponse.next();
    }

    // 未登录 → 跳 loginPath?returnTo=<原 URL>
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    url.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(url);
  };
}

// 兼容层：让用户可以 `import proxy from "mixlab-oidc-next/proxy"`
export default createAuthProxy;