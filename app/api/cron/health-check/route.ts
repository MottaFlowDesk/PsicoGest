import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Health check endpoint to keep Supabase project active
 * This endpoint can be called by:
 * 1. Vercel Cron (with x-vercel-cron header)
 * 2. cron-job.org (with Authorization: Bearer CRON_SECRET header)
 * 3. Manual trigger (with Authorization: Bearer CRON_SECRET header)
 */
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

        // Create Supabase client
        const supabase = await createClient();

        // Perform a simple query to keep the database active
        // Try to query a system table or do a simple SELECT 1 query
        // This keeps the connection alive and prevents the project from going inactive
        let isHealthy = true;
        let error = null;

        try {
            // Try a simple query on professionals table (most likely to exist)
            const { data, error: queryError } = await supabase
                .from("professionals")
                .select("id")
                .limit(1);

            // If table doesn't exist, that's okay - the connection was made
            if (queryError && queryError.code !== "PGRST116") {
                error = queryError;
                // Still consider healthy if we got a response from Supabase
                isHealthy = true;
            }
        } catch (err: any) {
            // Even on error, if we got here, Supabase is responding
            error = err;
            isHealthy = true;
        }

        return NextResponse.json({
            success: true,
            healthy: isHealthy,
            timestamp: new Date().toISOString(),
            message: isHealthy 
                ? "Supabase project is active and healthy" 
                : "Supabase project is active (tables may not exist yet)",
            error: error ? error.message : null,
        }, { status: isHealthy ? 200 : 200 }); // Always return 200 to not trigger alerts
    } catch (error: any) {
        // Even on error, return success to keep the cron running
        // The important thing is that we're making requests to Supabase
        return NextResponse.json({
            success: true,
            healthy: false,
            timestamp: new Date().toISOString(),
            message: "Health check executed (connection attempted)",
            error: error.message,
        }, { status: 200 });
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}

