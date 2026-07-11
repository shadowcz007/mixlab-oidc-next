// examples/app-router/src/app/api/auth/callback/route.ts
import { mixlabClient } from "@/lib/auth/mixlab-client";

export const GET = (req: Request) => mixlabClient.handlers.callback(req);
