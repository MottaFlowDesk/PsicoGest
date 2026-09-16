import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { runHealthCheck } from "@/lib/cron/health";

export async function GET(request: NextRequest) {
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

    const result = await runHealthCheck();

    return NextResponse.json(
        {
            success: true,
            healthy: result.healthy,
            timestamp: new Date().toISOString(),
            message: result.message,
            error: result.error,
        },
        { status: 200 }
    );
}

export async function POST(request: NextRequest) {
    return GET(request);
}
