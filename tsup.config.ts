import { defineConfig } from "tsup";

// tsup — esbuild 驱动，秒级构建。
// 7 个入口 + CLI（shebang via banner）。
// dual exports（ESM + CJS）+ d.ts。
export default defineConfig([
  {
    entry: ["src/index.ts", "src/provider.ts", "src/server.ts", "src/client.ts", "src/proxy.ts", "src/sanitize.ts"],
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