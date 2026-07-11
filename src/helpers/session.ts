import type { SessionOptions } from "iron-session";
import type { OidcUserInfo } from "../core/types";

// ============================================================
// iron-session 配置 builder + SessionData 类型
//
// 从 Poll Pink src/lib/auth/session.ts 抽出来，参数化所有硬编码。
// ============================================================

/**
 * Session 数据结构（同时存 user + OIDC 临时态）
 *
 * v1 OIDC 流程需要 4 个临时字段：
 * - oauthState: state（防 CSRF）
 * - oauthNonce: nonce（防 replay）
 * - oauthCodeVerifier: PKCE verifier（防 code 拦截）
 * - returnTo: 登录后回跳路径
 */
export interface SessionData {
  user?: OidcUserInfo;
  oauthState?: string;
  oauthNonce?: string;
  oauthCodeVerifier?: string;
  returnTo?: string;
}

export interface BuildSessionOptionsInput {
  /** 加密密码（≥ 32 字符） */
  password: string;
  /** cookie 名，默认 "mixlab-session" */
  cookieName?: string;
  /** 强制 secure 标志；默认根据 NODE_ENV 判断 */
  secure?: boolean;
}

/**
 * 构建 iron-session 配置
 * fail-fast：password 太短直接抛错
 */
export function buildSessionOptions(
  opts: BuildSessionOptionsInput
): SessionOptions {
  if (!opts.password || opts.password.length < 32) {
    throw new Error(
      `session password must be set and ≥ 32 characters (got ${opts.password?.length ?? 0})`
    );
  }

  return {
    password: opts.password,
    cookieName: opts.cookieName ?? "mixlab-session",
    cookieOptions: {
      secure: opts.secure ?? process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  };
}