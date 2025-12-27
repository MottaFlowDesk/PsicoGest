import { sendReminders } from "@/lib/notifications/reminder-service";
import { NextRequest, NextResponse } from "next/server";

// This endpoint can be called by:
// 1. Vercel Cron (with x-vercel-cron header)
// 2. cron-job.org (with Authorization: Bearer CRON_SECRET header)
// 3. Manual trigger (with Authorization: Bearer CRON_SECRET header)

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;
        const vercelCron = request.headers.get("x-vercel-cron");

        // Check authentication
        // Allow if: Vercel cron header OR valid Bearer token
        if (cronSecret) {
            const isValidToken = authHeader === `Bearer ${cronSecret}`;
            const isVercelCron = !!vercelCron;
            
            if (!isValidToken && !isVercelCron) {
                return NextResponse.json({ 
                    error: "Unauthorized",
                    message: "Missing or invalid authorization. Use 'Authorization: Bearer YOUR_CRON_SECRET' header."
                }, { status: 401 });
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

