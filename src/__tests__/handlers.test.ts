import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SignJWT,
  generateKeyPair,
  exportJWK,
  createLocalJWKSet,
  type KeyLike,
  type JWK,
} from "jose";
import { createMixLabClient } from "../server";
import { _setJwksForTesting, clearJwksCache } from "../core/jwks";

// ============================================================
// handler 单测：mock iron-session（用内存 store）+ fetch（jwks + token）
// ============================================================

// 内存模拟 iron-session cookie store
type SessionMap = Map<string, Record<string, unknown>>;
let sessions: SessionMap;

vi.mock("iron-session", async () => {
  return {
    getIronSession: async (
      _cookies: unknown,
      options: { password: string; cookieName: string }
    ) => {
      // 用 cookieName 作为 session key
      const sessionKey = options.cookieName;
      let data = (sessions.get(sessionKey) ?? {}) as Record<string, unknown>;
      return {
        get user() { return data.user; },
        set user(v) { data.user = v; },
        get oauthState() { return data.oauthState; },
        set oauthState(v) { data.oauthState = v; },
        get oauthNonce() { return data.oauthNonce; },
        set oauthNonce(v) { data.oauthNonce = v; },
        get oauthCodeVerifier() { return data.oauthCodeVerifier; },
        set oauthCodeVerifier(v) { data.oauthCodeVerifier = v; },
        get returnTo() { return data.returnTo; },
        set returnTo(v) { data.returnTo = v; },
        async save() {
          sessions.set(sessionKey, data);
        },
        async destroy() {
          sessions.delete(sessionKey);
          data = {};
        },
      };
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
  }),
}));

describe("handlers", () => {
  let privateKey: KeyLike;
  let publicJwk: JWK;
  const ISSUER = "https://idp.example.com";
  const CLIENT_ID = "cid_test";
  const BASE_URL = "https://app.example.com";
  const PASSWORD = "x".repeat(32);

  beforeEach(async () => {
    sessions = new Map();
    const keys = await generateKeyPair("RS256", { extractable: true });
    privateKey = keys.privateKey;
    const jwk = await exportJWK(keys.publicKey);
    publicJwk = {
      ...jwk,
      kid: "test-key",
      alg: "RS256",
      use: "sig",
    } as JWK;
    // 注入本地 JWKS（不走网络）—— 因为 jose 的 createRemoteJWKSet
    // 内部用的是 import-time fetch 引用，spyOn globalThis.fetch 不生效。
    const localKey = createLocalJWKSet({ keys: [publicJwk] });
    _setJwksForTesting(`${ISSUER}/jwks`, localKey as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearJwksCache();
  });

  function mockIdpEndpoints() {
    const fakeDiscovery = {
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/auth`,
      token_endpoint: `${ISSUER}/token`,
      jwks_uri: `${ISSUER}/jwks`,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/.well-known/openid-configuration")) {
        return new Response(JSON.stringify(fakeDiscovery), { status: 200 });
      }
      if (url === `${ISSUER}/jwks`) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
        });
      }
      if (url === `${ISSUER}/token`) {
        // 用真私钥签 id_token
        // 注：jest mock 内的 vi 不能 await 外部变量，所以这里用 inline signing
        return new Response(
          JSON.stringify({
            id_token: "PLACEHOLDER_TO_BE_OVERRIDDEN",
            access_token: "at_xxx",
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    });
  }

  it("login handler: 生成 state/nonce/PKCE + 302 跳 IdP", async () => {
    mockIdpEndpoints();
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });

    const res = await client.handlers.login(
      new Request(`${BASE_URL}/api/auth/login?returnTo=/dashboard`)
    );

    expect(res.status).toBe(307); // NextResponse.redirect 默认 307
    const location = res.headers.get("location")!;
    expect(location).toContain(`${ISSUER}/auth?`);
    expect(location).toContain(`client_id=${CLIENT_ID}`);
    expect(location).toContain(`response_type=code`);
    expect(location).toContain(`code_challenge_method=S256`);
    expect(location).toMatch(/state=[A-Za-z0-9_-]+/);
    expect(location).toMatch(/nonce=[A-Za-z0-9_-]+/);
    expect(location).toContain(`scope=openid+profile+email`);
    expect(location).toContain(`redirect_uri=${encodeURIComponent(`${BASE_URL}/login`)}`);

    // session 写入了临时态
    const sess = sessions.get("mixlab-session")!;
    expect(sess.oauthState).toBeDefined();
    expect(sess.oauthNonce).toBeDefined();
    expect(sess.oauthCodeVerifier).toBeDefined();
    expect(sess.returnTo).toBe("/dashboard");
  });

  it("login handler: returnTo 不合法走 fallback /", async () => {
    mockIdpEndpoints();
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });

    await client.handlers.login(
      new Request(`${BASE_URL}/api/auth/login?returnTo=https://evil.com`)
    );
    const sess = sessions.get("mixlab-session")!;
    expect(sess.returnTo).toBe("/");
  });

  it("callback handler: 成功流程", async () => {
    mockIdpEndpoints();

    // 1. 先调 login 写临时态
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });
    await client.handlers.login(new Request(`${BASE_URL}/api/auth/login?returnTo=/done`));

    // 2. 拿到 state 并签 id_token
    const sess = sessions.get("mixlab-session")!;
    const state = sess.oauthState as string;
    const nonce = sess.oauthNonce as string;

    const jwt = await new SignJWT({
        name: "Alice",
        email: "alice@example.com",
        nonce, // ★ payload.nonce = session 中的 nonce（OIDC 必需）
      })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setSubject("user-123")
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    // override token + jwks endpoint mock
    vi.restoreAllMocks(); // 清掉 mockIdpEndpoints 的 spyOn
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === `${ISSUER}/token`) {
        return new Response(
          JSON.stringify({ id_token: jwt, access_token: "at_xxx" }),
          { status: 200 }
        );
      }
      if (url === `${ISSUER}/jwks`) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
      }
      if (url.endsWith("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            issuer: ISSUER,
            authorization_endpoint: `${ISSUER}/auth`,
            token_endpoint: `${ISSUER}/token`,
            jwks_uri: `${ISSUER}/jwks`,
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    });

    // 3. 调 callback
    const res = await client.handlers.callback(
      new Request(`${BASE_URL}/login?code=code_xxx&state=${state}`)
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${BASE_URL}/done`);

    // user 写入 session，临时态清空
    const final = sessions.get("mixlab-session")!;
    expect(final.user).toEqual({
      sub: "user-123",
      name: "Alice",
      email: "alice@example.com",
      picture: undefined,
    });
    expect(final.oauthState).toBeUndefined();
    expect(final.oauthNonce).toBeUndefined();
    expect(final.oauthCodeVerifier).toBeUndefined();
    expect(final.returnTo).toBeUndefined();
  });

  it("callback handler: state 不匹配 → 拒绝（防 CSRF）", async () => {
    mockIdpEndpoints();
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });
    await client.handlers.login(new Request(`${BASE_URL}/api/auth/login`));

    const res = await client.handlers.callback(
      new Request(`${BASE_URL}/login?code=code_xxx&state=wrong_state`)
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("login_error=");
    expect(decodeURIComponent(loc)).toMatch(/CSRF/);
  });

  it("callback handler: missing code → 拒绝", async () => {
    mockIdpEndpoints();
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });

    const res = await client.handlers.callback(
      new Request(`${BASE_URL}/login?state=any`)
    );
    expect(res.headers.get("location")).toContain("Missing%20code");
  });

  it("logout handler: 清 session + 跳 /", async () => {
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });

    // 写 session
    sessions.set("mixlab-session", { user: { sub: "u1" } });

    const res = await client.handlers.logout(
      new Request(`${BASE_URL}/api/auth/logout`, { method: "POST" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${BASE_URL}/`);
    expect(sessions.has("mixlab-session")).toBe(false);
  });

  it("me handler: 返回 user", async () => {
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });
    sessions.set("mixlab-session", {
      user: { sub: "u1", name: "Alice" },
    });

    const res = await client.handlers.me();
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toEqual({ sub: "u1", name: "Alice" });
  });

  it("me handler: 未登录返回 user: null", async () => {
    const client = createMixLabClient({
      issuer: ISSUER,
      clientId: CLIENT_ID,
      baseUrl: BASE_URL,
      session: { password: PASSWORD },
    });

    const res = await client.handlers.me();
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it("createMixLabClient fail-fast", () => {
    expect(() =>
      createMixLabClient({
        issuer: "",
        clientId: CLIENT_ID,
        baseUrl: BASE_URL,
        session: { password: PASSWORD },
      })
    ).toThrow(/issuer is required/);

    expect(() =>
      createMixLabClient({
        issuer: ISSUER,
        clientId: "",
        baseUrl: BASE_URL,
        session: { password: PASSWORD },
      })
    ).toThrow(/clientId is required/);

    expect(() =>
      createMixLabClient({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        baseUrl: "",
        session: { password: PASSWORD },
      })
    ).toThrow(/baseUrl is required/);

    expect(() =>
      createMixLabClient({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        baseUrl: BASE_URL,
        session: { password: "" },
      })
    ).toThrow(/password is required/);

    expect(() =>
      createMixLabClient({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        baseUrl: BASE_URL,
        session: { password: "short" },
      })
    ).toThrow(/≥ 32 characters/);
  });
});