// mixlab-oidc-next — 顶层 re-export
//
// 双层 API：
// - 路径 A（主路径）：import { MixLab } from "mixlab-oidc-next/provider"
// - 路径 B（独立）：  import { createMixLabClient } from "mixlab-oidc-next/server"
//
// 顶层 index 只导出"两端共有"的东西，避免污染用户的 import surface。

export { sanitizeReturnTo } from "./sanitize";
export type { MixLabClient, MixLabClientConfig } from "./server";
export type { OidcUserInfo } from "./core/types";