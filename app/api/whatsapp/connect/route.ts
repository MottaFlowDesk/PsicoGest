import { createClient } from "@/lib/supabase/server";
import { connectWhatsApp } from "@/lib/whatsapp/client";
import { NextResponse } from "next/server";

export async function POST() {
    console.log('[WhatsApp Connect] Starting...');
    console.log('[WhatsApp Connect] API URL:', process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL);
    console.log('[WhatsApp Connect] API Key exists:', !!process.env.EVOLUTION_API_KEY);
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

        // Start WhatsApp connection
        const result = await connectWhatsApp(professional.id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        if (result.connected) {
            // Update database with connection status
            await supabase
                .from("professionals")
                .update({
                    whatsapp_connected_at: new Date().toISOString(),
                    whatsapp_phone: result.phone,
                })
                .eq("id", professional.id);

            return NextResponse.json({ connected: true, phone: result.phone });
        }

        return NextResponse.json({ qrCode: result.qrCode });
    } catch (error: any) {
        console.error("WhatsApp connect error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

