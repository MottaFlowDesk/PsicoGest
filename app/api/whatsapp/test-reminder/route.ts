import { createClient } from "@/lib/supabase/server";
import {
    getPlatformWhatsAppDisabledReason,
    sendTemplate,
    toE164,
} from "@/lib/messaging/meta-cloud";
import {
    buildAppointmentComponents,
    getTemplateLanguage,
    getTemplateName,
} from "@/lib/messaging/templates";
import { buildAppointmentConfirmationUrl } from "@/lib/app/public-url";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Envio de teste do template de lembrete pela WABA da plataforma.
 * Serve para validar template + número aprovados antes de subir em produção.
 */
export async function POST(request: NextRequest) {
    try {
        const { phone } = await request.json();

        const to = toE164(phone);
        if (!to) {
            return NextResponse.json(
                { error: "Informe um telefone válido com DDD (ex.: 11999998888)" },
                { status: 400 }
            );
        }

        const disabledReason = getPlatformWhatsAppDisabledReason();
        if (disabledReason) {
            return NextResponse.json({ error: disabledReason }, { status: 400 });
        }

        const templateName = getTemplateName("reminder_24h");
        if (!templateName) {
            return NextResponse.json(
                { error: "META_TEMPLATE_REMINDER_24H não configurado" },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id, full_name")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json({ error: "Professional not found" }, { status: 404 });
        }

        const { data: appointment } = await supabase
            .from("appointments")
            .select("id, scheduled_at, type, confirmation_token, patients ( full_name )")
            .eq("professional_id", professional.id)
            .gte("scheduled_at", new Date().toISOString())
            .in("status", ["scheduled", "confirmed"])
            .order("scheduled_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (!appointment?.confirmation_token) {
            return NextResponse.json(
                {
                    error: "Nenhum agendamento futuro encontrado",
                    suggestion: "Crie um agendamento na agenda e tente novamente.",
                },
                { status: 404 }
            );
        }

        const patient = Array.isArray(appointment.patients)
            ? appointment.patients[0]
            : appointment.patients;

        const scheduled = new Date(appointment.scheduled_at);

        const result = await sendTemplate({
            to,
            templateName,
            languageCode: getTemplateLanguage(),
            components: buildAppointmentComponents({
                patientName: patient?.full_name || "Paciente",
                professionalName: professional.full_name,
                date: format(scheduled, "EEEE, d 'de' MMMM", { locale: ptBR }),
                time: format(scheduled, "HH:mm"),
                type: appointment.type as "in_person" | "telehealth",
                urlSuffix: appointment.confirmation_token,
            }),
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            template: templateName,
            appointmentId: appointment.id,
            confirmationLink: buildAppointmentConfirmationUrl(appointment.confirmation_token),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao enviar teste";
        console.error("Error sending test reminder:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
