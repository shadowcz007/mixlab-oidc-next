// examples/app-router/src/lib/auth/session.ts
// 读 mixlab-session cookie(SDK 写入的 iron-session)

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  user?: {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  oauthState?: string;
  oauthNonce?: string;
  oauthCodeVerifier?: string;
  returnTo?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD!,
  cookieName: "mixlab-session",
  cookieOptions: {
    secure:   process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
