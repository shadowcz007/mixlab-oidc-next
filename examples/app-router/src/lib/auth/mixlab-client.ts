// examples/app-router/src/lib/auth/mixlab-client.ts
// MixLab OIDC client 单例(Path B 模式,推荐)

import { createMixLabClient, type MixLabClient } from "mixlab-oidc-next/server";

declare global {
  // eslint-disable-next-line no-var
  var __mixlabClient: MixLabClient | undefined;
}

function buildClient(): MixLabClient {
  return createMixLabClient({
    issuer:       process.env.MIXLAB_ISSUER!,
    clientId:     process.env.MIXLAB_CLIENT_ID!,
    baseUrl:      process.env.NEXT_PUBLIC_BASE_URL!,
    redirectPath: "/api/auth/callback",
    scopes:       ["openid", "profile", "email"],
    session: {
      password: process.env.SESSION_PASSWORD!,
    },
  });
}

export const mixlabClient: MixLabClient =
  globalThis.__mixlabClient ?? (globalThis.__mixlabClient = buildClient());
