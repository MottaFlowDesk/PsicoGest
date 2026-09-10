/**
 * Outbox de mensagens transacionais.
 *
 * Toda notificação de agendamento (confirmação e lembretes) passa por aqui:
 * o gatilho apenas enfileira, e um worker entrega via WhatsApp da plataforma
 * (Meta Cloud API) ou e-mail do profissional. A tabela message_outbox garante
 * idempotência por (appointment_id, channel, kind) e retry com backoff.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAppointmentConfirmationUrl } from "@/lib/app/public-url";
import {
    isPlatformWhatsAppEnabled,
    getPlatformWhatsAppDisabledReason,
    sendTemplate,
    toE164,
} from "@/lib/messaging/meta-cloud";
import {
    buildAppointmentComponents,
    buildMeetLinkComponents,
    getTemplateLanguage,
    getTemplateName,
    type MessageKind,
} from "@/lib/messaging/templates";
import {
    sendEmail,
    generateReminderEmailHtml,
    generateMeetLinkEmailHtml,
} from "@/lib/google/gmail";
import {
    generateAppointmentConfirmationEmailHtml,
    generateAppointmentConfirmationEmailSubject,
} from "@/lib/email/appointment-confirmation-template";

export type MessageChannel = "whatsapp" | "email";

/** Espera entre tentativas, em minutos, indexada por número de tentativas já feitas. */
const RETRY_BACKOFF_MINUTES = [2, 15, 60];
const DEFAULT_BATCH_SIZE = 25;

export interface OutboxPayload {
    /** Telefone E.164 (WhatsApp) ou endereço de e-mail. */
    to: string;
    patientName: string;
    professionalName: string;
    scheduledAt: string;
    durationMinutes: number;
    type: "in_person" | "telehealth";
    confirmationToken: string;
    meetLink?: string | null;
}

interface OutboxRow {
    id: string;
    professional_id: string;
    appointment_id: string;
    patient_id: string | null;
    channel: MessageChannel;
    kind: MessageKind;
    payload: OutboxPayload;
    attempts: number;
    max_attempts: number;
}

// -----------------------------------------------------------------------------
// Enfileiramento
// -----------------------------------------------------------------------------

interface AppointmentContext {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    type: "in_person" | "telehealth";
    status: string;
    confirmation_token: string | null;
    meet_link?: string | null;
    meeting_link?: string | null;
    patients: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        phone_e164: string | null;
        whatsapp_opt_in_at: string | null;
    } | null;
    professionals: {
        id: string;
        full_name: string;
        google_refresh_token: string | null;
    } | null;
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (value == null) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

const APPOINTMENT_SELECT = `
    id,
    scheduled_at,
    duration_minutes,
    type,
    status,
    confirmation_token,
    meeting_link,
    patients ( id, full_name, email, phone, phone_e164, whatsapp_opt_in_at ),
    professionals ( id, full_name, google_refresh_token )
`;

export interface EnqueueResult {
    queued: MessageChannel[];
    skipped: string[];
}

/**
 * Decide os canais elegíveis para um agendamento e cria os jobs na fila.
 * Chamável várias vezes com segurança: o índice único ignora duplicatas.
 */
export async function enqueueAppointmentMessage(params: {
    appointmentId: string;
    kind: MessageKind;
    /** Sobrescreve o canal do profissional (usado pelo fallback de e-mail). */
    channels?: MessageChannel[];
    /** Link da videochamada recém-criado, quando ainda não está na linha. */
    meetLink?: string | null;
    supabase?: SupabaseClient;
}): Promise<EnqueueResult> {
    const supabase = params.supabase ?? createAdminClient();
    const skipped: string[] = [];

    const { data, error } = await supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .eq("id", params.appointmentId)
        .single();

    if (error || !data) {
        return { queued: [], skipped: [error?.message || "Agendamento não encontrado"] };
    }

    const appointment = data as unknown as AppointmentContext;
    const patient = normalizeRelation(appointment.patients);
    const professional = normalizeRelation(appointment.professionals);

    if (!patient || !professional) {
        return { queued: [], skipped: ["Paciente ou profissional ausente"] };
    }

    const confirmationToken = await ensureConfirmationToken(
        supabase,
        appointment.id,
        appointment.confirmation_token
    );

    const { data: settings } = await supabase
        .from("settings")
        .select("reminder_channel")
        .eq("professional_id", professional.id)
        .maybeSingle();

    const reminderChannel: string = settings?.reminder_channel ?? "whatsapp_email";
    const allowWhatsApp =
        params.channels?.includes("whatsapp") ??
        (reminderChannel === "whatsapp_email" || reminderChannel === "whatsapp_only");
    const allowEmail =
        params.channels?.includes("email") ??
        (reminderChannel === "whatsapp_email" || reminderChannel === "email_only");

    const basePayload = {
        patientName: patient.full_name,
        professionalName: professional.full_name,
        scheduledAt: appointment.scheduled_at,
        durationMinutes: appointment.duration_minutes,
        type: appointment.type,
        confirmationToken,
        meetLink:
            params.meetLink ?? appointment.meet_link ?? appointment.meeting_link ?? null,
    };

    const jobs: Array<{ channel: MessageChannel; payload: OutboxPayload }> = [];

    if (allowWhatsApp) {
        const reason = whatsAppSkipReason(patient, params.kind);
        if (reason) {
            skipped.push(reason);
        } else {
            jobs.push({
                channel: "whatsapp",
                payload: { ...basePayload, to: patient.phone_e164 ?? toE164(patient.phone)! },
            });
        }
    }

    if (allowEmail) {
        if (!patient.email) {
            skipped.push("paciente sem e-mail cadastrado");
        } else if (!professional.google_refresh_token) {
            skipped.push("Gmail não conectado em Configurações → Integrações");
        } else {
            jobs.push({ channel: "email", payload: { ...basePayload, to: patient.email } });
        }
    }

    if (jobs.length === 0) {
        return { queued: [], skipped };
    }

    const { data: inserted, error: insertError } = await supabase
        .from("message_outbox")
        .upsert(
            jobs.map((job) => ({
                professional_id: professional.id,
                appointment_id: appointment.id,
                patient_id: patient.id,
                channel: job.channel,
                kind: params.kind,
                payload: job.payload,
                status: "queued",
            })),
            { onConflict: "appointment_id,channel,kind", ignoreDuplicates: true }
        )
        .select("channel");

    if (insertError) {
        return { queued: [], skipped: [...skipped, insertError.message] };
    }

    return {
        queued: (inserted ?? []).map((row) => row.channel as MessageChannel),
        skipped,
    };
}

function whatsAppSkipReason(
    patient: NonNullable<AppointmentContext["patients"]>,
    kind: MessageKind
): string | null {
    const disabledReason = getPlatformWhatsAppDisabledReason();
    if (disabledReason) return `WhatsApp da plataforma indisponível: ${disabledReason}`;
    if (!getTemplateName(kind)) return `sem template WhatsApp para "${kind}"`;
    if (!patient.phone_e164 && !toE164(patient.phone)) return "paciente sem telefone válido";
    if (!patient.whatsapp_opt_in_at) return "paciente sem opt-in de WhatsApp";
    return null;
}

async function ensureConfirmationToken(
    supabase: SupabaseClient,
    appointmentId: string,
    current: string | null
): Promise<string> {
    if (current) return current;

    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");

    await supabase
        .from("appointments")
        .update({ confirmation_token: token })
        .eq("id", appointmentId);

    return token;
}

// -----------------------------------------------------------------------------
// Worker
// -----------------------------------------------------------------------------

export interface ProcessOutboxResult {
    claimed: number;
    sent: number;
    failed: number;
    retrying: number;
    requeuedStale: number;
    errors: string[];
}

export async function processOutbox(
    options: { batchSize?: number } = {}
): Promise<ProcessOutboxResult> {
    const supabase = createAdminClient();
    const result: ProcessOutboxResult = {
        claimed: 0,
        sent: 0,
        failed: 0,
        retrying: 0,
        requeuedStale: 0,
        errors: [],
    };

    const { data: staleCount } = await supabase.rpc("requeue_stale_outbox", {
        stale_minutes: 10,
    });
    result.requeuedStale = typeof staleCount === "number" ? staleCount : 0;

    const { data: claimed, error: claimError } = await supabase.rpc("claim_outbox_batch", {
        batch_size: options.batchSize ?? DEFAULT_BATCH_SIZE,
    });

    if (claimError) {
        result.errors.push(`claim_outbox_batch: ${claimError.message}`);
        return result;
    }

    const jobs = (claimed ?? []) as unknown as OutboxRow[];
    result.claimed = jobs.length;

    for (const job of jobs) {
        try {
            const outcome =
                job.channel === "whatsapp"
                    ? await deliverWhatsApp(job)
                    : await deliverEmail(supabase, job);

            if (outcome.success) {
                await markSent(supabase, job, outcome.messageId);
                result.sent++;
                continue;
            }

            const canRetry = outcome.retryable !== false && job.attempts < job.max_attempts;

            if (canRetry) {
                await markRetry(supabase, job, outcome.error);
                result.retrying++;
            } else {
                await markFailed(supabase, job, outcome.error);
                result.failed++;
                await fallbackToEmail(job, result);
            }

            result.errors.push(`${job.kind}/${job.channel}: ${outcome.error}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            await markFailed(supabase, job, message);
            result.failed++;
            result.errors.push(`${job.kind}/${job.channel}: ${message}`);
        }
    }

    return result;
}

interface DeliveryOutcome {
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
}

async function deliverWhatsApp(job: OutboxRow): Promise<DeliveryOutcome> {
    if (!isPlatformWhatsAppEnabled()) {
        return {
            success: false,
            error: getPlatformWhatsAppDisabledReason() ?? "WhatsApp da plataforma desativado",
            retryable: false,
        };
    }

    const templateName = getTemplateName(job.kind);
    if (!templateName) {
        return {
            success: false,
            error: `Template WhatsApp não configurado para "${job.kind}"`,
            retryable: false,
        };
    }

    const { payload } = job;
    const scheduled = new Date(payload.scheduledAt);
    const date = format(scheduled, "EEEE, d 'de' MMMM", { locale: ptBR });
    const time = format(scheduled, "HH:mm");

    const components =
        job.kind === "meet_link"
            ? buildMeetLinkComponents({
                  patientName: payload.patientName,
                  professionalName: payload.professionalName,
                  date,
                  time,
                  urlSuffix: payload.confirmationToken,
              })
            : buildAppointmentComponents({
                  patientName: payload.patientName,
                  professionalName: payload.professionalName,
                  date,
                  time,
                  type: payload.type,
                  urlSuffix: payload.confirmationToken,
              });

    return sendTemplate({
        to: payload.to,
        templateName,
        languageCode: getTemplateLanguage(),
        components,
    });
}

async function deliverEmail(
    supabase: SupabaseClient,
    job: OutboxRow
): Promise<DeliveryOutcome> {
    const { data: professional } = await supabase
        .from("professionals")
        .select("google_refresh_token, full_name")
        .eq("id", job.professional_id)
        .single();

    if (!professional?.google_refresh_token) {
        return {
            success: false,
            error: "Gmail não conectado em Configurações → Integrações",
            retryable: false,
        };
    }

    const { payload } = job;
    const scheduled = new Date(payload.scheduledAt);
    const date = format(scheduled, "EEEE, d 'de' MMMM", { locale: ptBR });
    const time = format(scheduled, "HH:mm");
    const endTime = format(
        new Date(scheduled.getTime() + payload.durationMinutes * 60000),
        "HH:mm"
    );
    const confirmationLink = buildAppointmentConfirmationUrl(payload.confirmationToken);

    const email = buildEmailContent(job.kind, {
        ...payload,
        date,
        time,
        endTime,
        confirmationLink,
    });

    if (!email) {
        return { success: false, error: `Sem template de e-mail para "${job.kind}"`, retryable: false };
    }

    const result = await sendEmail(professional.google_refresh_token, {
        to: payload.to,
        from: { name: `${payload.professionalName} via PsicoGuest` },
        subject: email.subject,
        html: email.html,
    });

    if (result.success) {
        return { success: true };
    }

    // Token revogado / escopo ausente não se resolve com retry
    const message = result.error || "Falha no envio de e-mail";
    const permanent = /scope|invalid_grant|revoked|não conectado/i.test(message);
    return { success: false, error: message, retryable: !permanent };
}

function buildEmailContent(
    kind: MessageKind,
    data: OutboxPayload & {
        date: string;
        time: string;
        endTime: string;
        confirmationLink: string;
    }
): { subject: string; html: string } | null {
    const common = {
        patientName: data.patientName,
        professionalName: data.professionalName,
        date: data.date,
        time: data.time,
        type: data.type,
        confirmationLink: data.confirmationLink,
    };

    switch (kind) {
        case "confirmation":
            return {
                subject: generateAppointmentConfirmationEmailSubject(data.date, data.time),
                html: generateAppointmentConfirmationEmailHtml({
                    ...common,
                    endTime: data.endTime,
                }),
            };
        case "reminder_24h":
            return {
                subject: `Lembrete: sessão amanhã às ${data.time}`,
                html: generateReminderEmailHtml({ ...common, emailTitle: "Lembrete de Sessão" }),
            };
        case "reminder_2h":
            return {
                subject: `Lembrete: sessão em 2 horas (${data.time})`,
                html: generateReminderEmailHtml({
                    ...common,
                    emailTitle: "Sua sessão começa em 2 horas",
                }),
            };
        case "meet_link":
            if (!data.meetLink) return null;
            return {
                subject: `✓ Sessão confirmada — ${data.date}`,
                html: generateMeetLinkEmailHtml({
                    patientName: data.patientName,
                    professionalName: data.professionalName,
                    date: data.date,
                    time: data.time,
                    meetLink: data.meetLink,
                }),
            };
        default:
            return null;
    }
}

// -----------------------------------------------------------------------------
// Transições de estado
// -----------------------------------------------------------------------------

async function markSent(
    supabase: SupabaseClient,
    job: OutboxRow,
    messageId?: string
): Promise<void> {
    await supabase
        .from("message_outbox")
        .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider: job.channel === "whatsapp" ? "meta_cloud" : "gmail",
            provider_message_id: messageId ?? null,
            error: null,
        })
        .eq("id", job.id);

    await stampAppointment(supabase, job);
}

async function markRetry(
    supabase: SupabaseClient,
    job: OutboxRow,
    error?: string
): Promise<void> {
    const delayMinutes =
        RETRY_BACKOFF_MINUTES[Math.min(job.attempts - 1, RETRY_BACKOFF_MINUTES.length - 1)];
    const nextAttempt = new Date(Date.now() + delayMinutes * 60_000);

    await supabase
        .from("message_outbox")
        .update({
            status: "queued",
            next_attempt_at: nextAttempt.toISOString(),
            error: error ?? null,
        })
        .eq("id", job.id);
}

async function markFailed(
    supabase: SupabaseClient,
    job: OutboxRow,
    error?: string
): Promise<void> {
    await supabase
        .from("message_outbox")
        .update({ status: "failed", error: error ?? null })
        .eq("id", job.id);
}

/**
 * Marca confirmation_sent_at / reminder_sent_at quando o primeiro canal entrega.
 */
async function stampAppointment(supabase: SupabaseClient, job: OutboxRow): Promise<void> {
    const column =
        job.kind === "confirmation"
            ? "confirmation_sent_at"
            : job.kind === "reminder_24h" || job.kind === "reminder_2h"
              ? "reminder_sent_at"
              : null;

    if (!column) return;

    await supabase
        .from("appointments")
        .update({ [column]: new Date().toISOString() })
        .eq("id", job.appointment_id)
        .is(column, null);
}

/**
 * WhatsApp esgotou as tentativas: garante que o paciente receba por e-mail.
 */
async function fallbackToEmail(job: OutboxRow, result: ProcessOutboxResult): Promise<void> {
    if (job.channel !== "whatsapp") return;

    const fallback = await enqueueAppointmentMessage({
        appointmentId: job.appointment_id,
        kind: job.kind,
        channels: ["email"],
    });

    if (fallback.queued.length > 0) {
        result.errors.push(`${job.kind}: fallback de e-mail enfileirado`);
    }
}
