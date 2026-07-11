// examples/app-router/src/app/api/auth/me/route.ts
// 返回当前 session.user(给 client 端 fetch 用)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session.user ?? null });
}
