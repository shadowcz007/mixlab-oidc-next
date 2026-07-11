import { createHash, randomBytes } from "node:crypto";

// ============================================================
// PKCE S256 + state/nonce 生成
//
// 从 Poll Pink src/lib/auth/oidc.ts:85-118 抽出来，完全照搬。
// - 32 字节随机 → base64url 编码（无 padding）
// - code_challenge = base64url(SHA256(code_verifier))
// - state / nonce 同长度随机串
// ============================================================

/**
 * base64url 编码（无 padding）
 * RFC 4648 §5：URL-safe 字符集
 */
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 生成 N 字节随机字符串（base64url 编码）
 * 默认 32 字节 = 43 字符 base64url（256 bit 熵）
 */
function randomString(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** PKCE S256 对 */
export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomString(32);
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

/** state 参数（防 CSRF，43 字符） */
export function generateState(): string {
  return randomString(32);
}

/** nonce 参数（防 replay，43 字符） */
export function generateNonce(): string {
  return randomString(32);
}