// proxy.ts 占位 stub —— 阶段 5 实现 createAuthProxy helper
export interface AuthProxyOptions {
  publicPaths?: string[];
  loginPath?: string;
}
export function createAuthProxy(_opts: AuthProxyOptions = {}): unknown {
  throw new Error("createAuthProxy: not implemented yet — coming in v0.1 stage 5");
}