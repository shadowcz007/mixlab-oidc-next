import { describe, it, expect } from "vitest";
import { sanitizeReturnTo } from "../sanitize";

describe("sanitizeReturnTo", () => {
  // null / undefined / 空 → fallback
  it("null → fallback", () => {
    expect(sanitizeReturnTo(null)).toBe("/");
    expect(sanitizeReturnTo(null, "/dashboard")).toBe("/dashboard");
  });

  it("undefined → fallback", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/");
  });

  it("空字符串 → fallback", () => {
    expect(sanitizeReturnTo("")).toBe("/");
  });

  // 外链 → fallback
  it("http://evil.com → fallback", () => {
    expect(sanitizeReturnTo("http://evil.com")).toBe("/");
  });

  it("https://evil.com → fallback", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
  });

  it("javascript:alert(1) → fallback", () => {
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/");
  });

  // protocol-relative → fallback
  it("//evil.com → fallback", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/");
  });

  it("///evil.com → fallback", () => {
    expect(sanitizeReturnTo("///evil.com")).toBe("/");
  });

  // IE quirk
  it("/\\evil.com → fallback", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBe("/");
  });

  // 同源安全路径
  it("/safe → 透传", () => {
    expect(sanitizeReturnTo("/safe")).toBe("/safe");
  });

  it("/dashboard?x=1 → 透传", () => {
    expect(sanitizeReturnTo("/dashboard?x=1")).toBe("/dashboard?x=1");
  });

  it("/safe#hash → 透传", () => {
    expect(sanitizeReturnTo("/safe#hash")).toBe("/safe#hash");
  });

  it("/deep/nested/path → 透传", () => {
    expect(sanitizeReturnTo("/deep/nested/path")).toBe("/deep/nested/path");
  });

  // 自定义 fallback
  it("自定义 fallback", () => {
    expect(sanitizeReturnTo(null, "/home")).toBe("/home");
    expect(sanitizeReturnTo("http://evil", "/home")).toBe("/home");
  });

  // 边界：单字符
  it("\"/\" 透传（根路径合法）", () => {
    expect(sanitizeReturnTo("/")).toBe("/");
  });
});