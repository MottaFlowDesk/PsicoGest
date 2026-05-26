import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_CHANNELS = ["whatsapp_email", "email_only", "whatsapp_only"] as const;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
        }

        const body = await request.json();
        const reminder_24h = Boolean(body.reminder_24h);
        const reminder_2h = Boolean(body.reminder_2h);
        const reminder_channel = body.reminder_channel ?? "whatsapp_email";

        if (!VALID_CHANNELS.includes(reminder_channel)) {
            return NextResponse.json({ error: "Canal de lembrete inválido" }, { status: 400 });
        }

        const reminder_timing: string[] = [];
        if (reminder_24h) reminder_timing.push("24h");
        if (reminder_2h) reminder_timing.push("2h");

        const { error } = await supabase
            .from("settings")
            .upsert(
                {
                    professional_id: professional.id,
                    reminder_24h,
                    reminder_2h,
                    reminder_channel,
                    reminder_timing,
                },
                { onConflict: "professional_id" }
            );

        if (error) {
            console.error("Error updating reminder settings:", error);
            return NextResponse.json(
                {
                    error: "Falha ao salvar configurações",
                    details: error.message,
                    hint:
                        error.message.includes("reminder_24h") ||
                        error.message.includes("reminder_channel")
                            ? "Execute a migração 20250525000000_add_reminder_settings_columns.sql no Supabase."
                            : undefined,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Reminder settings error:", error);
        const message = error instanceof Error ? error.message : "Erro interno";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
