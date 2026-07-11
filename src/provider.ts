// ============================================================
// MixLab NextAuth v5 Provider（mixlab-oidc-next）
//
// 设计：
// - 用 `type: "oidc"`，NextAuth v5 自动 PKCE + state checks
// - 不强制加 "nonce" check（NextAuth 默认不校验 nonce，
//   我们在 callback 里自己 verify → 见 core/jwks.verifyIdToken）
// - issuer 默认 https://www.mixlab.top；自建 IdP 时可覆盖
//
// 用法：
//   import { MixLab } from "mixlab-oidc-next/provider"
//   NextAuth({ providers: [MixLab({ clientId: process.env.MIXLAB_CLIENT_ID! })] })
// ============================================================

/**
 * 公开配置选项（运行时）
 *
 * 注意：返回的 OIDCConfig 类型来自 next-auth，是 peer dep。
 * 没装 next-auth 的项目仍可 import 本文件，但类型会 unknown。
 */
export interface MixLabProviderOptions {
  /** MixLab 后台申请的 public client ID */
  clientId: string;
  /**
   * OIDC issuer URL（默认 https://www.mixlab.top）
   * 仅自建 IdP 时覆盖；必须已在 IdP 后台注册 redirect_uri
   */
  issuer?: string;
  /**
   * 直接指定 well-known URL；与 issuer 互斥
   * 自建 IdP 且 path 不是 /.well-known/openid-configuration 时用
   */
  wellKnown?: string;
  /**
   * OIDC scopes，默认 ["openid", "profile", "email"]
   * MixLab 必返 openid + profile；email 可选
   */
  scope?: string[];
  /**
   * provider id（用于 signIn("mixlab") 调用），默认 "mixlab"
   * 多 MixLab 实例共存时改这个
   */
  id?: string;
}

/**
 * 默认 MixLab OIDC issuer
 * - wellKnown 从 issuer 动态推导：${issuer}/.well-known/openid-configuration
 */
const DEFAULT_MIXLAB_ISSUER = "https://www.mixlab.top";

/**
 * NextAuth v5 provider factory for MixLab OIDC.
 *
 * 类型：返回 next-auth 的 OIDCConfig<Profile>（peer dep）。
 * 用户必须安装 next-auth v5 才能在 auth.ts 里用本函数的返回值。
 *
 * 内部默认行为：
 * - PKCE S256 自动启用（type:"oidc" + NextAuth v5 默认 checks:["pkce"]）
 * - state 参数自动生成 + 校验
 * - nonce 在 callback 里我们自己校验（核心/jwks.verifyIdToken）
 * - 用户名/邮箱/头像从 id_token claims 映射
 */
export function MixLab(opts: MixLabProviderOptions): unknown {
  if (!opts.clientId) {
    throw new Error("MixLab provider: clientId is required");
  }

  // 兼容层：next-auth 类型是 peer dep，没装时用 unknown。
  // 用户类型不会 broken——他们必须装 next-auth 才能用本函数。
  const issuer = opts.issuer ?? DEFAULT_MIXLAB_ISSUER;
  // wellKnown 优先级：用户传 > 从 issuer 推 > MixLab 默认
  const wellKnown =
    opts.wellKnown ?? `${issuer}/.well-known/openid-configuration`;
  const scopes = opts.scope ?? ["openid", "profile", "email"];
  const providerId = opts.id ?? "mixlab";

  // 返回 next-auth OIDCConfig 对象
  // 类型 cast 在 dynamic load 时不可避免（next-auth 是 peer dep）
  return {
    id: providerId,
    name: "MixLab",
    type: "oidc" as const,
    issuer,
    wellKnown,
    clientId: opts.clientId,
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
      [key: string]: unknown;
    }) {
      return {
        id: profile.sub,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: profile.picture ?? null,
      };
    },
  };
}