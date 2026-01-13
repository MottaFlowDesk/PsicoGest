import { createClient } from "@/lib/supabase/server";
import { disconnectWhatsApp } from "@/lib/whatsapp/client";
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
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json({ error: "Professional not found" }, { status: 404 });
        }

        // Disconnect WhatsApp
        await disconnectWhatsApp(professional.id);

        // Update database
        await supabase
            .from("professionals")
            .update({
                whatsapp_connected_at: null,
                whatsapp_phone: null,
                whatsapp_session: null,
            })
            .eq("id", professional.id);

        // Create notification for integration disconnection
        try {
            const { notifyIntegrationDisconnected } = await import("@/lib/notifications/system-notifications");
            await notifyIntegrationDisconnected(professional.id, {
                integrationType: "whatsapp",
            });
        } catch (notificationError) {
            console.error("Failed to create disconnection notification:", notificationError);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("WhatsApp disconnect error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

