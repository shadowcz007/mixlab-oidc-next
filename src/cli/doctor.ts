// ============================================================
// mixlab-oidc-next doctor —— 体检环境变量
//
// 检 6 项：
//   1. MIXLAB_ISSUER 已设
//   2. MIXLAB_CLIENT_ID 已设
//   3. NEXT_PUBLIC_BASE_URL 已设
//   4. SESSION_PASSWORD 长度 ≥ 32
//   5. SESSION_PASSWORD 不是占位符
//   6. （路径 A）AUTH_SECRET 长度 ≥ 32（可选，仅用 NextAuth 时检查）
//
// 注意：pass 必须是函数（不能用 boolean），否则 module-level 求值
// 会在 import 时跑一次（env 还没设）→ 永远 false。
// ============================================================

interface Check {
  name: string;
  pass: () => boolean;
  hint: string;
  optional?: boolean;
}

const CHECKS: Check[] = [
  {
    name: "MIXLAB_ISSUER is set",
    pass: () => !!process.env.MIXLAB_ISSUER,
    hint: "Set MIXLAB_ISSUER=https://www.mixlab.top (or your custom IdP)",
  },
  {
    name: "MIXLAB_CLIENT_ID is set",
    pass: () => !!process.env.MIXLAB_CLIENT_ID,
    hint: "Apply at https://www.mixlab.top/oauth/applications",
  },
  {
    name: "NEXT_PUBLIC_BASE_URL is set",
    pass: () => !!process.env.NEXT_PUBLIC_BASE_URL,
    hint: "Set NEXT_PUBLIC_BASE_URL=http://localhost:3000 (must match registered redirect_uri)",
  },
  {
    name: "SESSION_PASSWORD is ≥ 32 chars",
    pass: () => (process.env.SESSION_PASSWORD?.length ?? 0) >= 32,
    hint: "Generate: openssl rand -base64 32",
  },
  {
    name: "SESSION_PASSWORD is not a placeholder",
    pass: () =>
      !!process.env.SESSION_PASSWORD &&
      !/^(changeme|placeholder|please-change-me)/i.test(
        process.env.SESSION_PASSWORD
      ),
    hint: "Replace placeholder value with a real random secret",
  },
  {
    name: "AUTH_SECRET is ≥ 32 chars (NextAuth path A only)",
    pass: () => !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length >= 32,
    hint: "Generate: openssl rand -base64 32",
    optional: true,
  },
];

export function doctor(): void {
  console.log("MixLab OIDC environment check:\n");
  let ok = true;
  for (const check of CHECKS) {
    const passed = check.pass();
    const mark = passed ? "✓" : "✗";
    const label = check.optional ? `${check.name} (optional)` : check.name;
    console.log(`  ${mark} ${label}`);
    if (!passed && !check.optional) {
      ok = false;
      console.log(`      → ${check.hint}`);
    }
  }
  console.log();
  if (ok) {
    console.log("All required checks passed.");
  } else {
    console.error("Some checks failed. Fix above and re-run:");
    console.error("  npx mixlab-oidc-next doctor");
    process.exit(1);
  }
}