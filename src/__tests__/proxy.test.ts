import { describe, it, expect } from "vitest";
import { createAuthProxy } from "../proxy";
import { NextRequest } from "next/server";

// NextRequest 是 Request 的扩展，可直接用 Request + cookies header 构造
function mockRequest(
  pathname: string,
  search: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const url = `https://app.example.com${pathname}${search}`;
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe("createAuthProxy", () => {
  it("public path → 放行（NextResponse.next）", () => {
    const proxy = createAuthProxy();
    const res = proxy(mockRequest("/api/auth/login", ""));
    // NextResponse.next() 的 status 在 mock 环境里 default 是 200
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("default public paths 包含 /_next/", () => {
    const proxy = createAuthProxy();
    const res = proxy(mockRequest("/_next/static/foo.css", ""));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("default public paths 包含 /favicon.ico", () => {
    const proxy = createAuthProxy();
    const res = proxy(mockRequest("/favicon.ico", ""));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("自定义 publicPaths", () => {
    const proxy = createAuthProxy({ publicPaths: ["/public/"] });
    const res = proxy(mockRequest("/public/foo", ""));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("有 session cookie → 放行", () => {
    const proxy = createAuthProxy();
    const res = proxy(
      mockRequest("/dashboard", "", { "mixlab-session": "encrypted_xxx" })
    );
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("自定义 cookieName", () => {
    const proxy = createAuthProxy({ cookieName: "my-app-session" });
    const res = proxy(
      mockRequest("/dashboard", "", { "my-app-session": "encrypted_xxx" })
    );
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("未登录 → 跳 loginPath + returnTo", () => {
    const proxy = createAuthProxy();
    const res = proxy(mockRequest("/dashboard", "?foo=bar"));
    expect(res.status).toBe(307); // NextResponse.redirect 默认 307
    expect(res.headers.get("location")).toBe(
      "https://app.example.com/login?returnTo=%2Fdashboard%3Ffoo%3Dbar"
    );
  });

  it("自定义 loginPath", () => {
    const proxy = createAuthProxy({ loginPath: "/auth/signin" });
    const res = proxy(mockRequest("/dashboard", ""));
    expect(res.headers.get("location")).toBe(
      "https://app.example.com/auth/signin?returnTo=%2Fdashboard"
    );
  });

  it("protected path 但有 cookie → 放行", () => {
    const proxy = createAuthProxy({ publicPaths: ["/public/"] });
    const res = proxy(
      mockRequest("/dashboard", "", { "mixlab-session": "xxx" })
    );
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("默认 publicPaths 不覆盖其他路径 → 跳 login", () => {
    const proxy = createAuthProxy();
    const res = proxy(mockRequest("/other", ""));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://app.example.com/login?returnTo=%2Fother"
    );
  });
});