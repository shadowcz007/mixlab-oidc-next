import { createHandlers, type HandlersConfig } from "./helpers/handlers";
import { fetchDiscovery } from "./core/discovery";

// ============================================================
// createMixLabClient — 路径 B 的入口
//
// 用法：
//   const client = createMixLabClient({
//     issuer: process.env.MIXLAB_ISSUER!,
//     clientId: process.env.MIXLAB_CLIENT_ID!,
//     baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
//     session: { password: process.env.SESSION_PASSWORD! },
//   });
//
//   export const GET = (req) => client.handlers.login(req);
//   export const GET = (req) => client.handlers.callback(req);  // 默认 /login
//   export const POST = (req) => client.handlers.logout(req);
//   export const GET = () => client.handlers.me();
// ============================================================

export interface MixLabClientConfig {
  /** OIDC issuer URL（如 "https://www.mixlab.top"） */
  issuer: string;
  /** MixLab 后台申请的 public client ID */
  clientId: string;
  /**
   * 应用 base URL（必须显式 env 注入）
   * ★ 禁止从 host header 推断（防 host header injection）
   * ★ 必须在 OIDC provider 后台注册的 redirect_uri 完全一致
   */
  baseUrl: string;
  /** 回调路径，默认 "/login"（与 MixLab 后台注册的回调 URI 一致） */
  redirectPath?: string;
  /** OIDC scopes，默认 ["openid","profile","email"] */
  scopes?: string[];
  /** iron-session 配置 */
  session: {
    /** 加密密码（≥32 字符） */
    password: string;
    /** 默认 "mixlab-session" */
    cookieName?: string;
    /** 强制 secure；默认根据 NODE_ENV */
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
  /**
   * 预热 in-memory cache（discovery + JWKS 解析器）
   *
   * Vercel Serverless cold start 时，首次 /api/auth/login 路由会同步等待
   * fetchDiscovery + jose JWKS 初始化（合计 ~200-400ms）。在 Next.js
   * `instrumentation.ts` 启动钩子里调一次 warmUp()，第一次用户进站就能
   * 命中 in-memory cache，省掉这 200-400ms。
   *
   * 用法：
   * ```ts
   * // src/instrumentation.ts
   * export async function register() {
   *   if (process.env.NEXT_RUNTIME === "nodejs") {
   *     const { mixlabClient } = await import("@/lib/auth/mixlab-client");
   *     await mixlabClient.warmUp();   // fire-and-forget 也行
   *   }
   * }
   * ```
   *
   * - 失败抛错（应被外面 try/catch 捕获，避免阻断启动）
   * - 幂等：10 分钟内多次调用只 fetch 一次
   * - fire-and-forget 也是安全的：失败不会污染 cache
   */
  warmUp(): Promise<void>;
}

const DEFAULT_SCOPES = ["openid", "profile", "email"];
const DEFAULT_REDIRECT_PATH = "/login";
const DEFAULT_COOKIE_NAME = "mixlab-session";

/**
 * 创建 MixLab OIDC 客户端
 * - 立即 fail-fast 校验必要 config
 * - 返回的 handlers 挂到 Route Handler 上即可用
 */
export function createMixLabClient(cfg: MixLabClientConfig): MixLabClient {
  // fail-fast
  if (!cfg.issuer) throw new Error("createMixLabClient: issuer is required");
  if (!cfg.clientId) throw new Error("createMixLabClient: clientId is required");
  if (!cfg.baseUrl) throw new Error("createMixLabClient: baseUrl is required");
  if (!cfg.session?.password) {
    throw new Error("createMixLabClient: session.password is required");
  }

  const normalized: HandlersConfig = {
    issuer: cfg.issuer,
    clientId: cfg.clientId,
    baseUrl: cfg.baseUrl.replace(/\/+$/, ""), // 去尾 slash
    redirectPath: cfg.redirectPath ?? DEFAULT_REDIRECT_PATH,
    scopes: cfg.scopes ?? DEFAULT_SCOPES,
    sessionPassword: cfg.session.password,
    cookieName: cfg.session.cookieName ?? DEFAULT_COOKIE_NAME,
    secure: cfg.session.secure ?? process.env.NODE_ENV === "production",
  };

  return {
    handlers: createHandlers(normalized),
    /**
     * 预热 discovery in-memory cache
     * - fail-soft：抛错时由调用方决定是否吞掉
     * - 幂等：10min TTL 内多次调只 fetch 一次
     */
    async warmUp() {
      await fetchDiscovery(cfg.issuer);
      // 也可加 jwks 预热（jose createRemoteJWKSet 是 lazy 的，
      // 第一次 verify 才会触发；目前 fetchDiscovery 已覆盖最大成本
      // —— discovery fetch，jwks 解析代价小）。
    },
  };
}