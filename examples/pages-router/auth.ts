// examples/pages-router/auth.ts
// Pages Router 同样推荐 Path B(iron-session)
// Pages Router 不用 proxy.ts,改成用 middleware.ts(同名不同事):
//
// 1. 在项目根建 middleware.ts(Next 14/15) 或 proxy.ts(Next 16+)
//    内容复用 examples/app-router/proxy.ts(createAuthProxy)
// 2. 在 pages/api/auth/* 目录建 login.ts / callback.ts / logout.ts / me.ts
//    每个调 mixlabClient.handlers.*(与 app-router Route Handler 同构)
//
// 安装:同 app-router
//   npm install mixlab-oidc-next iron-session jose
//
// src/lib/auth/mixlab-client.ts(与 app-router 完全一样):
//   import { createMixLabClient } from "mixlab-oidc-next/server";
//   export const mixlabClient = createMixLabClient({
//     issuer: process.env.MIXLAB_ISSUER!,
//     clientId: process.env.MIXLAB_CLIENT_ID!,
//     baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
//     redirectPath: "/api/auth/callback",  // Pages Router 用 /api/* 路径
//     scopes: ["openid", "profile", "email"],
//     session: { password: process.env.SESSION_PASSWORD! },
//   });
//
// src/lib/auth/session.ts(同 app-router):
//   import { getIronSession } from "iron-session";
//   import { cookies } from "next/headers";
//   export async function getSession() {
//     return getIronSession(await cookies(), {
//       password: process.env.SESSION_PASSWORD!,
//       cookieName: "mixlab-session",
//       cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/" },
//     });
//   }
//
// src/pages/api/auth/login.ts:
//   import { mixlabClient } from "@/lib/auth/mixlab-client";
//   export default function handler(req, res) { return mixlabClient.handlers.login(req); }
//
// src/pages/api/auth/callback.ts:
//   import { mixlabClient } from "@/lib/auth/mixlab-client";
//   export default function handler(req, res) { return mixlabClient.handlers.callback(req); }
//
// src/pages/api/auth/logout.ts:
//   import { mixlabClient } from "@/lib/auth/mixlab-client";
//   export default function handler(req, res) { return mixlabClient.handlers.logout(req); }
//
// 完整 5 个文件结构同 app-router,只是路径从 app/ 变成 pages/api/。
