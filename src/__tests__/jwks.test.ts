import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, type KeyLike } from "jose";
import { verifyIdTokenWithKey } from "../core/jwks";

/**
 * JWKS 单测：用 createLocalJWKSet（不走网络）替代 createRemoteJWKSet。
 * 这样测 verifyIdToken 的 nonce/issuer/audience 严格校验逻辑，
 * 不依赖 jose 内部 cooldownDuration 的 fetch mock。
 */
describe("jwks verifyIdToken", () => {
  let privateKey: KeyLike;
  let key: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const keys = await generateKeyPair("RS256", { extractable: true });
    privateKey = keys.privateKey;
    const jwk = await exportJWK(keys.publicKey);
    const publicJwk = {
      ...jwk,
      kid: "test-key",
      alg: "RS256",
      use: "sig",
    };
    key = createLocalJWKSet({ keys: [publicJwk] });
  });

  async function signIdToken(claims: Record<string, unknown>): Promise<string> {
    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(claims.iss as string)
      .setAudience(claims.aud as string)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  }

  it("验签通过 + nonce 匹配 → 返回 user info", async () => {
    const jwt = await signIdToken({
      sub: "user-123",
      name: "Alice",
      email: "alice@example.com",
      picture: "https://example.com/a.png",
      nonce: "expected-nonce-xxx",
      iss: "https://idp.example.com",
      aud: "client_xxx",
    });

    const user = await verifyIdTokenWithKey(key, jwt, {
      issuer: "https://idp.example.com",
      audience: "client_xxx",
      expectedNonce: "expected-nonce-xxx",
    });
    expect(user.sub).toBe("user-123");
    expect(user.name).toBe("Alice");
    expect(user.email).toBe("alice@example.com");
    expect(user.picture).toBe("https://example.com/a.png");
  });

  it("nonce 不匹配 → 抛错（抗重放）", async () => {
    const jwt = await signIdToken({
      sub: "user-123",
      nonce: "wrong-nonce",
      iss: "https://idp.example.com",
      aud: "client_xxx",
    });

    await expect(
      verifyIdTokenWithKey(key, jwt, {
        issuer: "https://idp.example.com",
        audience: "client_xxx",
        expectedNonce: "expected-nonce-xxx",
      })
    ).rejects.toThrow(/nonce mismatch/);
  });

  it("issuer 不匹配 → 抛错", async () => {
    const jwt = await signIdToken({
      sub: "user-123",
      nonce: "expected-nonce-xxx",
      iss: "https://idp.example.com",
      aud: "client_xxx",
    });

    await expect(
      verifyIdTokenWithKey(key, jwt, {
        issuer: "https://evil.example.com",
        audience: "client_xxx",
        expectedNonce: "expected-nonce-xxx",
      })
    ).rejects.toThrow();
  });

  it("audience 不匹配 → 抛错", async () => {
    const jwt = await signIdToken({
      sub: "user-123",
      nonce: "expected-nonce-xxx",
      iss: "https://idp.example.com",
      aud: "client_xxx",
    });

    await expect(
      verifyIdTokenWithKey(key, jwt, {
        issuer: "https://idp.example.com",
        audience: "wrong_audience",
        expectedNonce: "expected-nonce-xxx",
      })
    ).rejects.toThrow();
  });
});