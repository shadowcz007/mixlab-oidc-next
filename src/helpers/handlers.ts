import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { fetchDiscovery } from "../core/discovery";
import {
  generateNonce,
  generatePkce,
  generateState,
} from "../core/pkce";
import { verifyIdToken } from "../core/jwks";
import { sanitizeReturnTo } from "../sanitize";
import { buildSessionOptions, type SessionData } from "./session";

// ============================================================
// 4 个 server-side handler 工厂
//
// 设计：
// - 用户用 createMixLabClient() 拿到 handlers，挂到自己的 Route Handler
// - 回调**必须是 Route Handler**（不能用 RSC page），因为：
//   RSC 在 Next 14.x 不能写 cookie，session.save() 会静默失败
// - state 严格匹配（防 CSRF）
// - nonce 严格匹配（防 replay，由 verifyIdToken 内部执行）
// ============================================================

/** handlers 工厂输入（来自 server.ts 标准化后的 config） */
export interface HandlersConfig {
  issuer: string;
  clientId: string;
  /** baseUrl + redirectPath 拼出 redirect_uri */
  baseUrl: string;
  redirectPath: string;
  scopes: string[];
  sessionPassword: string;
  cookieName: string;
  secure: boolean;
}

/**
 * 与 id_token 交换的最小 token 响应
 * （从 Poll Pink exchangeCodeForToken 抽出来）
 */
interface TokenExchangeResponse {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

async function exchangeCodeForToken(
  tokenEndpoint: string,
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TokenExchangeResponse;
}

function buildAuthorizationUrl(opts: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    scope: opts.scopes.join(" "),
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${opts.authorizationEndpoint}?${params.toString()}`;
}

/**
 * 创建 4 个 handler
 */
export function createHandlers(cfg: HandlersConfig) {
  const sessionOptions = buildSessionOptions({
    password: cfg.sessionPassword,
    cookieName: cfg.cookieName,
    secure: cfg.secure,
  });

  const redirectUri = `${cfg.baseUrl}${cfg.redirectPath}`;

  return {
    /**
     * GET handler：发起 OIDC 授权码流程
     * - 生成 state / nonce / PKCE 对
     * - 写临时 session
     * - 302 跳转到 IdP authorize endpoint
     */
    async login(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));

      // Next 15+: cookies() returns a Promise; await it
      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      session.oauthState = generateState();
      session.oauthNonce = generateNonce();
      const pkce = generatePkce();
      session.oauthCodeVerifier = pkce.codeVerifier;
      session.returnTo = returnTo;
      await session.save();

      const discovery = await fetchDiscovery(cfg.issuer);
      const authUrl = buildAuthorizationUrl({
        authorizationEndpoint: discovery.authorization_endpoint,
        clientId: cfg.clientId,
        redirectUri,
        scopes: cfg.scopes,
        state: session.oauthState,
        nonce: session.oauthNonce,
        codeChallenge: pkce.codeChallenge,
      });

      return NextResponse.redirect(authUrl);
    },

    /**
     * GET handler：OIDC 回调
     * - 校验 state（防 CSRF）
     * - code → token 交换
     * - jose 验签（iss/aud/nonce 严格）
     * - 写 user session + 清临时态
     * - 302 跳回 returnTo
     */
    async callback(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");

      function fail(msg: string): Response {
        return NextResponse.redirect(
          new URL(`/?login_error=${encodeURIComponent(msg)}`, req.url)
        );
      }

      // IdP 直接返回的错误
      if (errorParam) return fail(errorDesc ?? errorParam);
      if (!code || !state) return fail("Missing code or state parameter");

      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      if (!session.oauthState || !session.oauthNonce || !session.oauthCodeVerifier) {
        return fail("Login session expired. Please start over from the home page.");
      }

      // CSRF 校验
      if (state !== session.oauthState) {
        return fail("Invalid state. Possible CSRF attack — refusing to complete login.");
      }

      try {
        const discovery = await fetchDiscovery(cfg.issuer);
        const tokens = await exchangeCodeForToken(
          discovery.token_endpoint,
          code,
          session.oauthCodeVerifier,
          cfg.clientId,
          redirectUri
        );
        const user = await verifyIdToken(
          discovery.jwks_uri,
          tokens.id_token,
          {
            issuer: cfg.issuer,
            audience: cfg.clientId,
            expectedNonce: session.oauthNonce,
          }
        );

        // 写 user，清临时态
        session.user = user;
        session.oauthState = undefined;
        session.oauthNonce = undefined;
        session.oauthCodeVerifier = undefined;
        const returnTo = session.returnTo ?? "/";
        session.returnTo = undefined;
        await session.save();

        return NextResponse.redirect(new URL(returnTo, req.url));
      } catch (err) {
        console.error("[mixlab callback]", err);
        return fail(
          err instanceof Error ? err.message : "Unknown error during login"
        );
      }
    },

    /**
     * POST handler：登出
     * - 清 session cookie
     * - 302 跳回首页
     */
    async logout(_req: Request): Promise<Response> {
      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      session.destroy();
      return NextResponse.redirect(new URL("/", _req.url));
    },

    /**
     * GET handler：返回当前 session.user
     * - 不要求登录；返回 { user: SessionUser | null }
     */
    async me(): Promise<Response> {
      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      return NextResponse.json({ user: session.user ?? null });
    },
  };
}