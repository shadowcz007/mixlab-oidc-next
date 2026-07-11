// examples/app-router/src/app/api/auth/logout/route.ts
import { mixlabClient } from "@/lib/auth/mixlab-client";

export const POST = (req: Request) => mixlabClient.handlers.logout(req);
