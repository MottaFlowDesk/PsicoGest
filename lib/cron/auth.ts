import type { NextRequest } from "next/server";

/**
 * Mesmo critério das rotas /api/cron/*:
 * - sem CRON_SECRET: libera
 * - com CRON_SECRET: header x-vercel-cron OU Authorization Bearer
 */
export function isCronAuthorized(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return true;
    if (request.headers.get("x-vercel-cron")) return true;
    return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}
