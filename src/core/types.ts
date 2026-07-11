// ============================================================
// OIDC 公共类型（mixlab-oidc-next）
//
// 从 Poll Pink 抽出来（pollpink/src/lib/auth/oidc.ts），保持完全兼容。
// 核心类型保持稳定；阶段 2 不会改；后续 v0.2 可扩展。
// ============================================================

/** OIDC id_token 解析后的 user 信息 */
export interface OidcUserInfo {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  // v0.1.5+:扩展 claim(AgentLink 端在 id_token 一起发,SDK 自动解析)
  // RP 端(RP=消费方,如 mixlab-home)用 `as` cast 或 extends 即可拿到
  // 字段缺失时为 undefined(取决于 OP 是否在 id_token 带这些 claim)
  [key: string]: unknown;
}

/** OIDC token endpoint 响应 */
export interface OidcTokenResponse {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** OIDC discovery doc（最小子集；多读到的字段透传） */
export interface DiscoveryDoc {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  [key: string]: unknown;
}