import { describe, it, expect } from "vitest";
import { MixLab } from "../provider";

describe("MixLab provider", () => {
  it("返回合法 OIDCConfig 形状", () => {
    const config = MixLab({ clientId: "cid_test_xxx" }) as Record<string, unknown>;
    expect(config.id).toBe("mixlab");
    expect(config.name).toBe("MixLab");
    expect(config.type).toBe("oidc");
    expect(config.clientId).toBe("cid_test_xxx");
    expect(config.issuer).toBe("https://www.mixlab.top");
    expect(config.wellKnown).toBe(
      "https://www.mixlab.top/.well-known/openid-configuration"
    );
  });

  it("自定义 issuer 覆盖默认", () => {
    const config = MixLab({
      clientId: "cid_test",
      issuer: "https://idp.example.com",
    }) as Record<string, unknown>;
    expect(config.issuer).toBe("https://idp.example.com");
    expect(config.wellKnown).toBe(
      "https://idp.example.com/.well-known/openid-configuration"
    );
  });

  it("自定义 wellKnown 覆盖 issuer 默认", () => {
    const config = MixLab({
      clientId: "cid_test",
      wellKnown: "https://idp.example.com/oidc/.well-known/openid-configuration",
    }) as Record<string, unknown>;
    expect(config.wellKnown).toBe(
      "https://idp.example.com/oidc/.well-known/openid-configuration"
    );
  });

  it("自定义 scopes 覆盖默认", () => {
    const config = MixLab({
      clientId: "cid_test",
      scope: ["openid", "profile"],
    }) as Record<string, unknown>;
    const auth = config.authorization as { params: { scope: string } };
    expect(auth.params.scope).toBe("openid profile");
  });

  it("默认 scopes = openid + profile + email", () => {
    const config = MixLab({ clientId: "cid_test" }) as Record<string, unknown>;
    const auth = config.authorization as { params: { scope: string } };
    expect(auth.params.scope).toBe("openid profile email");
  });

  it("自定义 provider id", () => {
    const config = MixLab({ clientId: "cid_test", id: "mixlab-staging" }) as Record<
      string,
      unknown
    >;
    expect(config.id).toBe("mixlab-staging");
  });

  it("profile 函数映射 id_token claims", () => {
    const config = MixLab({ clientId: "cid_test" }) as {
      profile: (p: Record<string, unknown>) => Record<string, unknown>;
    };
    const user = config.profile({
      sub: "user-123",
      name: "Alice",
      email: "alice@example.com",
      picture: "https://example.com/a.png",
    });
    expect(user).toEqual({
      id: "user-123",
      name: "Alice",
      email: "alice@example.com",
      image: "https://example.com/a.png",
    });
  });

  it("profile 函数缺字段兜底 null", () => {
    const config = MixLab({ clientId: "cid_test" }) as {
      profile: (p: Record<string, unknown>) => Record<string, unknown>;
    };
    const user = config.profile({ sub: "user-456" });
    expect(user).toEqual({
      id: "user-456",
      name: null,
      email: null,
      image: null,
    });
  });

  it("clientId 缺失抛错", () => {
    expect(() => MixLab({ clientId: "" })).toThrow(/clientId is required/);
  });
});