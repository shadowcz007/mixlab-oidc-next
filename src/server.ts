// server.ts 占位 stub —— 阶段 4 实现 createMixLabClient 完整逻辑
// 当前暴露类型 + throw stub，让 index.ts / 顶层能 typecheck。

export interface MixLabClientConfig {
  /** OIDC issuer URL（如 "https://www.mixlab.top"） */
  issuer: string;
  /** MixLab 后台申请的 public client ID */
  clientId: string;
  /** 应用 base URL（必须显式 env 注入，禁止从 host header 推断） */
  baseUrl: string;
  /** 回调路径，默认 "/login" */
  redirectPath?: string;
  /** OIDC scopes，默认 ["openid","profile","email"] */
  scopes?: string[];
  /** iron-session 配置 */
  session: {
    /** 加密密码（≥32 字符） */
    password: string;
    /** 默认 "mixlab-session" */
    cookieName?: string;
    /** 默认 14 天 */
    ttlSeconds?: number;
    /** 默认 NODE_ENV === "production" */
    secure?: boolean;
  };
}

export interface MixLabClient {
  handlers: {
    login(req: Request): Promise<Response>;
    callback(req: Request): Promise<Response>;
    logout(req: Request): Promise<Response>;
    me(): Promise<Response>;
  };
}

export function createMixLabClient(_cfg: MixLabClientConfig): MixLabClient {
  throw new Error("createMixLabClient: not implemented yet — coming in v0.1 stage 4");
}