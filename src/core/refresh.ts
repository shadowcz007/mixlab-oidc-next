import type { OidcTokenResponse } from "./types";

// ============================================================
// Refresh Token（v0.1 stub）
//
// 当前 session 默认 14 天 TTL 足够覆盖大多数场景；refresh_token
// 自动轮换是 v0.2 路线图。本文件仅暴露类型签名。
//
// 实现时应：
//   1. POST token_endpoint with grant_type=refresh_token
//   2. 同样验签新 id_token（防 IdP 异常）
//   3. 更新 cookie session
// ============================================================

/**
 * 用 refresh_token 换新 access_token / id_token
 * @throws {Error} v0.1 暂未实现；v0.2 路线图
 */
export async function refreshAccessToken(
  _tokenEndpoint: string,
  _refreshToken: string,
  _clientId: string
): Promise<OidcTokenResponse> {
  throw new Error(
    "refreshAccessToken: not implemented in v0.1; planned for v0.2"
  );
}