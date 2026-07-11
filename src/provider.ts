// ============================================================
// MixLab NextAuth v5 Provider（mixlab-oidc-next）
//
// 设计：
// - 用 `type: "oidc"`，NextAuth v5 自动 PKCE S256（默认 checks:["pkce"]）
// - ★ 显式补全 checks:["pkce","state","nonce"]
//   2026-07-11 mixlab-home 接入实测：NextAuth v5 默认 checks 只 ["pkce"]，
//   state.create / nonce.create 会 return undefined，
//   authorize URL 缺 state/nonce → IdP 拒绝时报误导性"缺少 client_id"。
//   显式设后 authorize URL 完整(state + nonce 都在),IdP 接受。
//   详见 mixlab-home post-mortem:
//   github.com/shadowcz007/mixlab-home/blob/main/docs/AUTH-INCIDENT-2026-07-11.md
// - 不强制加 nonce check 到 NextAuth 框架(它默认不校验),
//   我们在 callback 里自己 verify → 见 core/jwks.verifyIdToken
// - issuer 默认 https://www.mixlab.top;自建 IdP 时可覆盖
//
// 用法(注意：官方推荐 Path B iron-session,见 README):
//   import { MixLab } from "mixlab-oidc-next/provider"
//   NextAuth({ providers: [MixLab({ clientId: process.env.MIXLAB_CLIENT_ID! })] })
// ============================================================

/**
 * 公开配置选项(运行时)
 *
 * 注意:返回的 OIDCConfig 类型来自 next-auth,是 peer dep。
 * 没装 next-auth 的项目仍可 import 本文件,但类型会 unknown。
 */
export interface MixLabProviderOptions {
  /** MixLab 后台申请的 public client ID */
  clientId: string;
  /**
   * OIDC issuer URL(默认 https://www.mixlab.top)
   * 仅自建 IdP 时覆盖;必须已在 IdP 后台注册 redirect_uri
   */
  issuer?: string;
  /**
   * 直接指定 well-known URL;与 issuer 互斥
   * 自建 IdP 且 path 不是 /.well-known/openid-configuration 时用
   */
  wellKnown?: string;
  /**
   * OIDC scopes,默认 ["openid", "profile", "email"]
   * MixLab 必返 openid + profile;email 可选
   */
  scope?: string[];
  /**
   * provider id(用于 signIn("mixlab") 调用),默认 "mixlab"
   * 多 MixLab 实例共存时改这个
   */
  id?: string;
}

/**
 * 默认 MixLab OIDC issuer
 * - wellKnown 从 issuer 动态推导:${issuer}/.well-known/openid-configuration
 */
const DEFAULT_MIXLAB_ISSUER = "https://www.mixlab.top";

/**
 * NextAuth v5 provider factory for MixLab OIDC.
 *
 * 类型:返回 next-auth 的 OIDCConfig<Profile>(peer dep)。
 * 用户必须安装 next-auth v5 才能在 auth.ts 里用本函数的返回值。
 *
 * 内部默认行为:
 * - PKCE S256 自动启用(type:"oidc" + NextAuth v5 默认 checks:["pkce"])
 * - ★ 显式补全 checks 为 ["pkce","state","nonce"]
 *   详见文件顶部注释
 * - state 参数自动生成 + 校验
 * - nonce 在 callback 里我们自己校验(核心/jwks.verifyIdToken)
 * - 用户名/邮箱/头像从 id_token claims 映射
 *
 * 注意:虽然我们已经补全了 checks 解决 authorize URL 缺 state 的问题,
 * 但生产环境仍推荐 Path B(iron-session + 4 个 Route Handler)。
 * 原因见 README §0 "为什么推荐 Path B"。
 */
export function MixLab(opts: MixLabProviderOptions): unknown {
  if (!opts.clientId) {
    throw new Error("MixLab provider: clientId is required");
  }

  // 兼容层:next-auth 类型是 peer dep,没装时用 unknown。
  // 用户类型不会 broken——他们必须装 next-auth 才能用本函数。
  const issuer = opts.issuer ?? DEFAULT_MIXLAB_ISSUER;
  // wellKnown 优先级:用户传 > 从 issuer 推 > MixLab 默认
  const wellKnown =
    opts.wellKnown ?? `${issuer}/.well-known/openid-configuration`;
  const scopes = opts.scope ?? ["openid", "profile", "email"];
  const providerId = opts.id ?? "mixlab";

  // 返回 next-auth OIDCConfig 对象
  // 类型 cast 在 dynamic load 时不可避免(next-auth 是 peer dep)
  return {
    id: providerId,
    name: "MixLab",
    type: "oidc" as const,
    issuer,
    wellKnown,
    clientId: opts.clientId,
    // ★ 关键:显式补全 OIDC 安全检查
    // 不设的话 NextAuth v5 @auth/core 默认只 ["pkce"],state/nonce 缺失
    // → IdP 拒绝时误导性报"缺少 client_id"
    // 实测踩坑 4 轮(详见 provider.ts 文件顶部注释 + AUTH-INCIDENT-2026-07-11.md)
    checks: ["pkce", "state", "nonce"],
    authorization: {
      params: {
        scope: scopes.join(" "),
      },
    },
    profile(profile: {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
      picture_original?: string;
      preferred_username?: string;
      profile_url?: string;
      [key: string]: unknown;
    }) {
      return {
        id: profile.sub,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: profile.picture_original ?? profile.picture ?? null,
      };
    },
  };
}