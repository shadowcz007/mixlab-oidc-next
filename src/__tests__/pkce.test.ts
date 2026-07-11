import { describe, it, expect } from "vitest";
import { generatePkce, generateState, generateNonce } from "../core/pkce";
import { createHash } from "node:crypto";

describe("pkce", () => {
  it("generatePkce returns 43-char verifier and 43-char challenge", () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    expect(codeVerifier).toHaveLength(43);
    expect(codeChallenge).toHaveLength(43);
    // base64url 字符集
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("code_challenge = base64url(SHA256(code_verifier))", () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    const expected = createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(codeChallenge).toBe(expected);
  });

  it("generatePkce 输出每次唯一", () => {
    const a = generatePkce();
    const b = generatePkce();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it("generateState 长度 43 且每次唯一", () => {
    const a = generateState();
    const b = generateState();
    expect(a).toHaveLength(43);
    expect(b).toHaveLength(43);
    expect(a).not.toBe(b);
  });

  it("generateNonce 长度 43 且每次唯一", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toHaveLength(43);
    expect(b).toHaveLength(43);
    expect(a).not.toBe(b);
  });

  it("base64url 字符集不含 + / =", () => {
    // 跑 100 次保证随机性不会撞到边界
    for (let i = 0; i < 100; i++) {
      const { codeVerifier } = generatePkce();
      expect(codeVerifier).not.toMatch(/[+/=]/);
    }
  });
});