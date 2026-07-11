import type { DiscoveryDoc } from "./types";

// ============================================================
// OIDC Discovery Doc 获取 + 10min in-memory 缓存
//
// 从 Poll Pink src/lib/auth/oidc.ts:61-83 抽出来。
// - 缓存 key 用 issuer URL（多 IdP 隔离）
// - TTL 10 分钟，Serverless 友好（cold start 重建）
// - 失败时抛错，让上层决定 401/500
// ============================================================

const TTL_MS = 10 * 60 * 1000;

/** 模块级 in-memory cache（每 lambda 进程独立） */
const cache = new Map<string, { doc: DiscoveryDoc; fetchedAt: number }>();

/**
 * 拉取并缓存 discovery doc
 * @throws {Error} 当 fetch 失败或 issuer 不匹配时
 */
export async function fetchDiscovery(issuer: string): Promise<DiscoveryDoc> {
  const now = Date.now();
  const hit = cache.get(issuer);
  if (hit && now - hit.fetchedAt < TTL_MS) {
    return hit.doc;
  }

  const url = `${issuer}/.well-known/openid-configuration`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText}`);
  }

  const doc = (await res.json()) as DiscoveryDoc;

  // 严格校验 issuer（防 issuer substitution 攻击）
  if (doc.issuer !== issuer) {
    throw new Error(`OIDC issuer mismatch: expected ${issuer}, got ${doc.issuer}`);
  }

  cache.set(issuer, { doc, fetchedAt: now });
  return doc;
}

/**
 * 测试 / 调试用：清空 cache
 * @internal
 */
export function clearDiscoveryCache(): void {
  cache.clear();
}