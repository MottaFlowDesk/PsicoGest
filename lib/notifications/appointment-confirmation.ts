import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendEmail } from "@/lib/google/gmail";
import {
    generateAppointmentConfirmationEmailHtml,
    generateAppointmentConfirmationEmailSubject,
} from "@/lib/email/appointment-confirmation-template";
import { buildAppointmentConfirmationUrl } from "@/lib/app/public-url";
import { sendWhatsAppMessage, generateReminderMessage } from "@/lib/whatsapp/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizeRelation<T>(value: T | T[] | null): T | null {
    if (value == null) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Envia e-mail e/ou WhatsApp com link de confirmação após criar o agendamento.
 */
export async function sendAppointmentConfirmation(appointmentId: string): Promise<{
    sent: boolean;
    channel?: "email" | "whatsapp" | "both";
    error?: string;
}> {
    if (!supabaseServiceKey) {
        return { sent: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select(`
            id,
            scheduled_at,
            duration_minutes,
            type,
            confirmation_token,
            confirmation_sent_at,
            patients ( full_name, email, phone ),
            professionals (
                id,
                full_name,
                google_refresh_token,
                google_calendar_connected,
                whatsapp_connected_at
            )
        `)
        .eq("id", appointmentId)
        .single();

    if (fetchError || !appointment) {
        return { sent: false, error: fetchError?.message || "Agendamento não encontrado" };
    }

    if (appointment.confirmation_sent_at) {
        return { sent: true, channel: undefined };
    }

    const patient = normalizeRelation(appointment.patients) as {
        full_name: string;
        email: string | null;
        phone: string | null;
    } | null;

    const professional = normalizeRelation(appointment.professionals) as {
        id: string;
        full_name: string;
        google_refresh_token: string | null;
        google_calendar_connected: boolean | null;
        whatsapp_connected_at: string | null;
    } | null;

    let confirmationToken = appointment.confirmation_token as string | null;

    if (!confirmationToken) {
        const { randomBytes } = await import("crypto");
        confirmationToken = randomBytes(32).toString("hex");
        await supabase
            .from("appointments")
            .update({ confirmation_token: confirmationToken })
            .eq("id", appointmentId);
    }

    if (!patient || !professional) {
        return { sent: false, error: "Dados incompletos para envio" };
    }

    const { data: settings } = await supabase
        .from("settings")
        .select("reminder_channel")
        .eq("professional_id", professional.id)
        .maybeSingle();

    const channel = settings?.reminder_channel ?? "whatsapp_email";
    const scheduledDate = new Date(appointment.scheduled_at);
    const formattedDate = format(scheduledDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    const formattedTime = format(scheduledDate, "HH:mm");
    const formattedEndTime = format(
        new Date(scheduledDate.getTime() + appointment.duration_minutes * 60000),
        "HH:mm"
    );
    const confirmationLink = buildAppointmentConfirmationUrl(confirmationToken);

    let emailSent = false;
    let whatsappSent = false;
    const errors: string[] = [];

    const tryWhatsApp =
        (channel === "whatsapp_email" || channel === "whatsapp_only") &&
        professional.whatsapp_connected_at &&
        patient.phone;

    const tryEmail =
        (channel === "whatsapp_email" || channel === "email_only") &&
        professional.google_refresh_token &&
        patient.email;

    if (tryWhatsApp) {
        try {
            const result = await sendWhatsAppMessage(
                professional.id,
                patient.phone!,
                generateReminderMessage({
                    patientName: patient.full_name,
                    professionalName: professional.full_name,
                    date: formattedDate,
                    time: formattedTime,
                    type: appointment.type as "in_person" | "telehealth",
                    confirmationLink,
                })
            );
            if (result.success) whatsappSent = true;
            else errors.push("WhatsApp: falha no envio");
        } catch (e) {
            console.error("WhatsApp confirmation error:", e);
            errors.push("WhatsApp: erro no envio");
        }
    }

    if (tryEmail) {
        try {
            const result = await sendEmail(professional.google_refresh_token!, {
                to: patient.email!,
                from: { name: `${professional.full_name} via PsicoGuest` },
                subject: generateAppointmentConfirmationEmailSubject(
                    formattedDate,
                    formattedTime
                ),
                html: generateAppointmentConfirmationEmailHtml({
                    patientName: patient.full_name,
                    professionalName: professional.full_name,
                    date: formattedDate,
                    time: formattedTime,
                    endTime: formattedEndTime,
                    type: appointment.type as "in_person" | "telehealth",
                    confirmationLink,
                }),
            });
            if (result.success) {
                emailSent = true;
            } else {
                errors.push(result.error || "E-mail: falha no envio");
            }
        } catch (e) {
            console.error("Email confirmation error:", e);
            errors.push("E-mail: erro no envio");
        }
    }

    const sent = emailSent || whatsappSent;

    if (sent) {
        await supabase
            .from("appointments")
            .update({ confirmation_sent_at: new Date().toISOString() })
            .eq("id", appointmentId);
    }

    if (!sent) {
        const reasons: string[] = [...errors];
        if (!patient.email && (channel === "email_only" || channel === "whatsapp_email")) {
            reasons.push("paciente sem e-mail cadastrado");
        }
        if (!professional.google_refresh_token) {
            reasons.push("Gmail não conectado em Configurações → Integrações");
        }
        if (!patient.phone && channel.includes("whatsapp")) {
            reasons.push("paciente sem telefone");
        }
        if (!professional.whatsapp_connected_at && channel.includes("whatsapp")) {
            reasons.push("WhatsApp não conectado");
        }
        return {
            sent: false,
            error: reasons.length ? reasons.join("; ") : "Não foi possível enviar confirmação",
        };
    }

    const usedChannel =
        emailSent && whatsappSent ? "both" : emailSent ? "email" : "whatsapp";

    return { sent: true, channel: usedChannel };
}
