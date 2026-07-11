import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { OidcUserInfo } from "./types";

// ============================================================
// id_token 验签（jose + JWKS）
//
// 从 Poll Pink src/lib/auth/oidc.ts:174-218 抽出来，关键差异：
// - 参数化 issuer / audience（Poll Pink 用 module-level const）
// - 保留严格 nonce 校验（不留宽容分支 —— 抗重放双保险）
// ============================================================

/** JWKS in-memory cache（per jwks_uri） */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(jwksUri: string) {
  let jwks = jwksCache.get(jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri), {
      cacheMaxAge: 10 * 60 * 1000, // 10 分钟
      cooldownDuration: 30 * 1000, // 30 秒冷却
    });
    jwksCache.set(jwksUri, jwks);
  }
  return jwks;
}

/**
 * 测试钩子：用预构造的 JWKS 替换 cache 中的 jwks 函数
 * @internal 单测用；生产请勿调用
 */
export function _setJwksForTesting(
  jwksUri: string,
  jwks: ReturnType<typeof createRemoteJWKSet>
): void {
  jwksCache.set(jwksUri, jwks);
}

export interface VerifyIdTokenOptions {
  /** 期望的 issuer（必须与 id_token.iss 严格匹配） */
  issuer: string;
  /** 期望的 audience / client_id */
  audience: string;
  /** 期望的 nonce（必须与 id_token.nonce 严格匹配 —— 抗重放） */
  expectedNonce: string;
}

/**
 * 验证 id_token 并提取 user info
 * @throws {Error} 当签名/issuer/audience/nonce 校验失败或 sub 缺失
 */
export async function verifyIdToken(
  jwksUri: string,
  idToken: string,
  opts: VerifyIdTokenOptions
): Promise<OidcUserInfo> {
  return verifyIdTokenWithKey(getJWKS(jwksUri), idToken, opts);
}

/**
 * 用预构造的 key（通常是 createLocalJWKSet）验证 id_token
 * 给单测用（不发起网络请求）
 */
export async function verifyIdTokenWithKey(
  key: JWTVerifyGetKey,
  idToken: string,
  opts: VerifyIdTokenOptions
): Promise<OidcUserInfo> {
  const { payload } = await jwtVerify(idToken, key, {
    issuer: opts.issuer,
    audience: opts.audience,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("id_token missing sub claim");
  }

  // ★ 严格 nonce 校验：抗重放。不留宽容分支（Poll Pink 2026-06-24 实测稳定）。
  if (payload.nonce !== opts.expectedNonce) {
    throw new Error("id_token nonce mismatch");
  }

  return {
    sub: payload.sub,
    name: typeof payload.name === "string" ? payload.name : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

/** 测试 / 调试用：清空 JWKS cache */
export function clearJwksCache(): void {
  jwksCache.clear();
}