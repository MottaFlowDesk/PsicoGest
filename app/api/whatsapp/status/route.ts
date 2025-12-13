import { createClient } from "@/lib/supabase/server";
import { getWhatsAppStatus } from "@/lib/whatsapp/client";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id, whatsapp_connected_at, whatsapp_phone")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json({ error: "Professional not found" }, { status: 404 });
        }

        // Check in-memory status
        const status = await getWhatsAppStatus(professional.id);

        // If connected in memory, update database if needed
        if (status.connected && !professional.whatsapp_connected_at) {
            await supabase
                .from("professionals")
                .update({
                    whatsapp_connected_at: new Date().toISOString(),
                    whatsapp_phone: status.phone,
                })
                .eq("id", professional.id);
        }

        return NextResponse.json({
            connected: status.connected,
            phone: status.phone || professional.whatsapp_phone,
        });
    } catch (error: any) {
        console.error("WhatsApp status error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

