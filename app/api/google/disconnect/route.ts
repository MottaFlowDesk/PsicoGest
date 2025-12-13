import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Remove Google credentials
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Google disconnect error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

