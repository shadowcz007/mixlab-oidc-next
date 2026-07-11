// mixlab-oidc-next — 顶层 re-export
//
// 唯一公开入口:mixlab-oidc-next/server
//   import { createMixLabClient } from "mixlab-oidc-next/server"
//
// 不再提供 NextAuth v5 Provider(0.1.4 移除):Path A 在生产环境有
// 已知坑(authorize URL 默认缺 state/nonce),已被 mixlab-home 实战
// 验证不可靠。直接用 Path B(iron-session + 4 个 Route Handler)
// 是 pollpink 2026-06 上线零事故的生产验证路径。
//
// 历史:0.1.0-0.1.3 有过 Path A(./provider 子路径),0.1.4 起移除。

export { sanitizeReturnTo } from "./sanitize";
export type { MixLabClient, MixLabClientConfig } from "./server";
export type { OidcUserInfo } from "./core/types";
