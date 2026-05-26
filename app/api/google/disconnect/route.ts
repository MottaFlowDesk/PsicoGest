import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id, google_refresh_token")
            .eq("user_id", user.id)
            .single();

        if (professional?.google_refresh_token) {
            const { revokeGoogleRefreshToken } = await import("@/lib/google/auth");
            await revokeGoogleRefreshToken(professional.google_refresh_token);
        }

        const { error } = await supabase
            .from("professionals")
            .update({
                google_calendar_connected: false,
                google_refresh_token: null,
            })
            .eq("user_id", user.id);

        if (error) {
            console.error("Error disconnecting Google:", error);
            return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
        }

        // Create notification for integration disconnection
        try {
            if (professional) {
                const { notifyIntegrationDisconnected } = await import("@/lib/notifications/system-notifications");
                await notifyIntegrationDisconnected(professional.id, {
                    integrationType: "google",
                });
            }
        } catch (notificationError) {
            console.error("Failed to create disconnection notification:", notificationError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Google disconnect error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

