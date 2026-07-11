import { defineConfig } from "tsup";

// tsup — esbuild 驱动，秒级构建。
// 5 个入口 + CLI（shebang via banner）。
// dual exports（ESM + CJS）+ d.ts。
//
// 0.1.4 重大变更:移除 src/provider.ts 入口（NextAuth v5 Provider）。
// Path A（NextAuth v5 + MixLab Provider）在生产环境有 2 个已知坑，
// 已被 mixlab-home 实战确认不可靠。仅保留 Path B（iron-session）。
export default defineConfig([
  {
    entry: [
      "src/index.ts",
      "src/server.ts",
      "src/client.ts",
      "src/proxy.ts",
      "src/sanitize.ts",
    ],
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    target: "es2022",
  },
  // CLI 入口独立 config：加 shebang + 不生成 d.ts（CLI 无需类型）
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm", "cjs"],
    dts: false,
    splitting: false,
    sourcemap: true,
    target: "es2022",
    banner: { js: "#!/usr/bin/env node" },
  },
]);
