import type { NextConfig } from "next";

const config: NextConfig = {
  // 显式声明本仓库 npm 包路径（npm workspaces 也可）
  transpilePackages: ["mixlab-oidc-next"],
};

export default config;