import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { doctor } from "../cli/doctor";

describe("doctor", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("EXIT");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function setupValidEnv() {
    vi.stubEnv("MIXLAB_ISSUER", "https://www.mixlab.top");
    vi.stubEnv("MIXLAB_CLIENT_ID", "cid_xxx");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_PASSWORD", "x".repeat(32));
  }

  it("所有 check 通过", () => {
    setupValidEnv();
    expect(() => doctor()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("缺 MIXLAB_ISSUER → exit 1", () => {
    setupValidEnv();
    vi.stubEnv("MIXLAB_ISSUER", "");
    expect(() => doctor()).toThrow();
  });

  it("缺 SESSION_PASSWORD → exit 1", () => {
    setupValidEnv();
    vi.stubEnv("SESSION_PASSWORD", "");
    expect(() => doctor()).toThrow();
  });

  it("SESSION_PASSWORD 太短 → exit 1", () => {
    setupValidEnv();
    vi.stubEnv("SESSION_PASSWORD", "short");
    expect(() => doctor()).toThrow();
  });

  it("SESSION_PASSWORD 是占位符 → exit 1", () => {
    setupValidEnv();
    vi.stubEnv("SESSION_PASSWORD", "please-change-me-to-something-secure");
    expect(() => doctor()).toThrow();
  });

  it("AUTH_SECRET 缺失不影响（optional）", () => {
    setupValidEnv();
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => doctor()).not.toThrow();
  });

  it("AUTH_SECRET 太短不影响（optional）", () => {
    setupValidEnv();
    vi.stubEnv("AUTH_SECRET", "short");
    expect(() => doctor()).not.toThrow();
  });
});