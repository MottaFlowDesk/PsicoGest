import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { runReminders } from "@/lib/cron/reminders";

export async function GET(request: NextRequest) {
    try {
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

        console.log("Starting reminder job...");
        const job = await runReminders();
        console.log("24h reminders:", job.results["24h"]);
        console.log("2h reminders:", job.results["2h"]);

        return NextResponse.json({
            success: true,
            results: job.results,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Cron job error";
        console.error("Cron job error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}
