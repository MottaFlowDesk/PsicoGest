import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { runHealthCheck } from "@/lib/cron/health";
import { runReminders } from "@/lib/cron/reminders";
import { runOutbox } from "@/lib/cron/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest) {
    if (!isCronAuthorized(request)) {
        return NextResponse.json(
            {
                error: "Unauthorized",
                message:
                    "Missing or invalid authorization. Use 'Authorization: Bearer YOUR_CRON_SECRET' header.",
            },
            { status: 401 }
        );
    }

    const jobs: Record<string, unknown> = {};

    try {
        jobs.health = await runHealthCheck();
        console.log("[cron/tick] health", jobs.health);
    } catch (error) {
        const message = error instanceof Error ? error.message : "health failed";
        console.error("[cron/tick] health error", message);
        jobs.health = { ok: false, error: message };
    }

    try {
        jobs.reminders = await runReminders();
        console.log("[cron/tick] reminders", jobs.reminders);
    } catch (error) {
        const message = error instanceof Error ? error.message : "reminders failed";
        console.error("[cron/tick] reminders error", message);
        jobs.reminders = { ok: false, error: message };
    }

    try {
        jobs.outbox = await runOutbox();
        console.log("[cron/tick] outbox", jobs.outbox);
    } catch (error) {
        const message = error instanceof Error ? error.message : "outbox failed";
        console.error("[cron/tick] outbox error", message);
        jobs.outbox = { ok: false, error: message };
    }

    const failed = ["health", "reminders", "outbox"].filter(
        (name) => (jobs[name] as { ok?: boolean } | undefined)?.ok === false
    );

    return NextResponse.json({
        success: failed.length === 0,
        jobs,
        timestamp: new Date().toISOString(),
    });
}

export async function GET(request: NextRequest) {
    return handle(request);
}

export async function POST(request: NextRequest) {
    return handle(request);
}
