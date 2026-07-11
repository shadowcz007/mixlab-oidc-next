import { describe, it, expect, beforeEach } from "vitest";
import { fetchDiscovery, clearDiscoveryCache } from "../core/discovery";

describe("discovery", () => {
  beforeEach(() => {
    clearDiscoveryCache();
  });

  it("fetch discovery doc 并缓存", async () => {
    const fakeDoc = {
      issuer: "https://idp.example.com",
      authorization_endpoint: "https://idp.example.com/auth",
      token_endpoint: "https://idp.example.com/token",
      jwks_uri: "https://idp.example.com/jwks",
    };

    // mock fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/.well-known/openid-configuration")) {
        return new Response(JSON.stringify(fakeDoc), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const doc = await fetchDiscovery("https://idp.example.com");
      expect(doc.issuer).toBe("https://idp.example.com");
      expect(doc.authorization_endpoint).toBe("https://idp.example.com/auth");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("非 2xx 抛错", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response("server error", { status: 500 });
    }) as typeof fetch;

    try {
      await expect(fetchDiscovery("https://idp.example.com")).rejects.toThrow(
        /OIDC discovery failed: 500/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("issuer 不匹配时抛错（防 substitution 攻击）", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          issuer: "https://evil.example.com",
          authorization_endpoint: "https://evil.example.com/auth",
          token_endpoint: "https://evil.example.com/token",
          jwks_uri: "https://evil.example.com/jwks",
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    try {
      await expect(fetchDiscovery("https://idp.example.com")).rejects.toThrow(
        /OIDC issuer mismatch/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("TTL 内重复调用不重新 fetch", async () => {
    let fetchCount = 0;
    const fakeDoc = {
      issuer: "https://idp.example.com",
      authorization_endpoint: "https://idp.example.com/auth",
      token_endpoint: "https://idp.example.com/token",
      jwks_uri: "https://idp.example.com/jwks",
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCount++;
      return new Response(JSON.stringify(fakeDoc), { status: 200 });
    }) as typeof fetch;

    try {
      await fetchDiscovery("https://idp.example.com");
      await fetchDiscovery("https://idp.example.com");
      await fetchDiscovery("https://idp.example.com");
      expect(fetchCount).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});