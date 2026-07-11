import { describe, it, expect } from "vitest";
import { refreshAccessToken } from "../core/refresh";

describe("refresh (v0.1 stub)", () => {
  it("v0.1 调用抛 not-implemented", async () => {
    await expect(
      refreshAccessToken("https://idp/token", "rt_xxx", "client_xxx")
    ).rejects.toThrow(/not implemented in v0.1/);
  });
});