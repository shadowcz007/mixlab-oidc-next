import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMixLabClient } from "../server";
import { clearDiscoveryCache } from "../core/discovery";

// ============================================================
// createMixLabClient 单测
//
// 主要验证：
// 1. warmUp() 走 discovery 流程并写入 in-memory cache
// 2. fail-fast：缺 config 时启动前就抛
// 3. handlers 各方法存在（具体行为在 handlers.test.ts 测）
// ============================================================

const fakeDoc = {
  issuer: "https://idp.example.com",
  authorization_endpoint: "https://idp.example.com/auth",
  token_endpoint: "https://idp.example.com/token",
  jwks_uri: "https://idp.example.com/jwks",
};

function makeValidConfig() {
  return {
    issuer: "https://idp.example.com",
    clientId: "test-client",
    baseUrl: "https://app.example.com",
    redirectPath: "/login",
    scopes: ["openid", "profile"],
    session: {
      password: "0123456789abcdef0123456789abcdef0123456789abcdef", // 50 chars
      cookieName: "test-session",
      secure: false,
    },
  };
}

describe("createMixLabClient", () => {
  beforeEach(() => {
    clearDiscoveryCache();
    vi.restoreAllMocks();
  });

  it("fail-fast：缺 issuer 立即抛", () => {
    expect(() =>
      createMixLabClient({
        ...makeValidConfig(),
        issuer: "",
      } as never)
    ).toThrow(/issuer is required/);
  });

  it("fail-fast：缺 clientId 立即抛", () => {
    expect(() =>
      createMixLabClient({
        ...makeValidConfig(),
        clientId: "",
      } as never)
    ).toThrow(/clientId is required/);
  });

  it("fail-fast：缺 baseUrl 立即抛", () => {
    expect(() =>
      createMixLabClient({
        ...makeValidConfig(),
        baseUrl: "",
      } as never)
    ).toThrow(/baseUrl is required/);
  });

  it("fail-fast：缺 session.password 立即抛", () => {
    expect(() =>
      createMixLabClient({
        ...makeValidConfig(),
        session: { password: "" },
      } as never)
    ).toThrow(/session\.password is required/);
  });

  it("返回 4 个 handler + warmUp", () => {
    const client = createMixLabClient(makeValidConfig());
    expect(typeof client.handlers.login).toBe("function");
    expect(typeof client.handlers.callback).toBe("function");
    expect(typeof client.handlers.logout).toBe("function");
    expect(typeof client.handlers.me).toBe("function");
    expect(typeof client.warmUp).toBe("function");
  });

  it("warmUp() 拉取 discovery 并写入 cache", async () => {
    const fetchSpy = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/.well-known/openid-configuration")) {
        return new Response(JSON.stringify(fakeDoc), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = createMixLabClient(makeValidConfig());
    await client.warmUp();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstCallArg = fetchSpy.mock.calls[0]?.[0];
    expect(firstCallArg).toBeDefined();
    expect(firstCallArg!.toString()).toContain(
      "/.well-known/openid-configuration"
    );
  });

  it("warmUp() 幂等：连续调多次只 fetch 一次（靠 10min TTL）", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(JSON.stringify(fakeDoc), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = createMixLabClient(makeValidConfig());
    await client.warmUp();
    await client.warmUp();
    await client.warmUp();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("warmUp() fetch 失败时抛错（由调用方决定怎么吞）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("server error", { status: 503 }))
    );

    const client = createMixLabClient(makeValidConfig());
    await expect(client.warmUp()).rejects.toThrow(/OIDC discovery failed/);
  });

  it("warmUp() issuer 不匹配抛错", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ ...fakeDoc, issuer: "https://evil.example.com" }),
          { status: 200 }
        )
      )
    );

    const client = createMixLabClient(makeValidConfig());
    await expect(client.warmUp()).rejects.toThrow(/issuer mismatch/);
  });
});
