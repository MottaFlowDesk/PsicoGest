import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { reminder_24h, reminder_2h, reminder_channel } = body;

        // Validate reminder_channel
        const validChannels = ['whatsapp_email', 'email_only', 'whatsapp_only'];
        if (reminder_channel && !validChannels.includes(reminder_channel)) {
            return NextResponse.json({ error: "Invalid reminder channel" }, { status: 400 });
        }

        const { error } = await supabase
            .from("settings")
            .update({
                reminder_24h,
                reminder_2h,
                reminder_channel,
            })
            .eq("professional_id", professional.id);

        if (error) {
            console.error("Error updating reminder settings:", error);
            return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Reminder settings error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

