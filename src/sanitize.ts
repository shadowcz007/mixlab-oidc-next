// ============================================================
// Open redirect 防护：sanitizeReturnTo
//
// 从 Poll Pink src/app/api/auth/login/route.ts:23-24 抽出来。
//
// 规则：
// 1. null / undefined / 空 → fallback
// 2. 不以 "/" 开头 → fallback（防外链）
// 3. 以 "//" 开头 → fallback（防 protocol-relative URL //evil.com）
// 4. 以 "/\" 开头 → fallback（防 IE/Edge quirk）
// ============================================================

export function sanitizeReturnTo(
  input: string | null | undefined,
  fallback = "/"
): string {
  if (!input) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//")) return fallback;
  if (input.startsWith("/\\")) return fallback;
  return input;
}