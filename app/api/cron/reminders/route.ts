import { sendReminders } from "@/lib/notifications/reminder-service";
import { NextRequest, NextResponse } from "next/server";

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/reminders",
//     "schedule": "0 * * * *"  // Every hour
//   }]
// }

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        // In production, verify the cron secret
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            // Also check Vercel cron header
            const vercelCron = request.headers.get("x-vercel-cron");
            if (!vercelCron) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        console.log("Starting reminder job...");

        // Send 24h reminders
        const results24h = await sendReminders("24h");
        console.log("24h reminders:", results24h);

        // Send 2h reminders
        const results2h = await sendReminders("2h");
        console.log("2h reminders:", results2h);

        return NextResponse.json({
            success: true,
            results: {
                "24h": results24h,
                "2h": results2h,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Cron job error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}

