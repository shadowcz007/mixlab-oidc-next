// examples/app-router/src/app/api/auth/login/route.ts
import { mixlabClient } from "@/lib/auth/mixlab-client";

export const GET  = (req: Request) => mixlabClient.handlers.login(req);
export const POST = (req: Request) => mixlabClient.handlers.login(req);
