import { createClient } from "@/lib/supabase/server";
import { getPlatformWhatsAppDisabledReason } from "@/lib/messaging/meta-cloud";
import { getTemplateName } from "@/lib/messaging/templates";
import { NextResponse } from "next/server";

/**
 * Status do canal WhatsApp da plataforma para o profissional logado.
 *
 * Não existe mais conexão por profissional: o que importa é se a WABA do
 * PsicoGuest está configurada e como as mensagens dele estão sendo entregues.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

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

        const disabledReason = getPlatformWhatsAppDisabledReason();
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: rows } = await supabase
            .from("message_outbox")
            .select("status")
            .eq("professional_id", professional.id)
            .eq("channel", "whatsapp")
            .gte("created_at", since);

        const counts = { queued: 0, sent: 0, failed: 0 };
        for (const row of rows ?? []) {
            if (row.status === "sent") counts.sent++;
            else if (row.status === "failed") counts.failed++;
            else if (row.status === "queued" || row.status === "sending") counts.queued++;
        }

        return NextResponse.json({
            mode: "platform",
            available: !disabledReason,
            reason: disabledReason,
            templates: {
                confirmation: !!getTemplateName("confirmation"),
                reminder_24h: !!getTemplateName("reminder_24h"),
                reminder_2h: !!getTemplateName("reminder_2h"),
            },
            last30Days: counts,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao ler status";
        console.error("WhatsApp status error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
