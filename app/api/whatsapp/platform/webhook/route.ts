import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueAppointmentMessage } from "@/lib/messaging/outbox";
import { markMessageAsRead, sendText } from "@/lib/messaging/meta-cloud";
import { buildAppointmentConfirmationUrl } from "@/lib/app/public-url";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Webhook da WABA da plataforma (Meta Cloud API).
 *
 * Responsabilidade única: registrar status de entrega na outbox. Texto livre do
 * paciente nunca altera agendamento — a confirmação só acontece pelo link
 * assinado em /confirm/[token].
 */

// GET — verificação do webhook no painel da Meta
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && verifyToken && token === verifyToken) {
        return new NextResponse(challenge ?? "", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
    const raw = await request.text();

    if (!verifySignature(raw, request.headers.get("x-hub-signature-256"))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let body: MetaWebhookBody;
    try {
        body = JSON.parse(raw) as MetaWebhookBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    try {
        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const value = change.value;
                if (!value) continue;

                for (const status of value.statuses ?? []) {
                    await handleDeliveryStatus(status);
                }

                for (const message of value.messages ?? []) {
                    await handleInboundMessage(message);
                }
            }
        }
    } catch (error) {
        // A Meta reenvia em caso de erro; logamos e devolvemos 200 para não
        // acumular retries em falhas nossas de persistência.
        console.error("[Meta Webhook] Erro ao processar evento:", error);
    }

    return NextResponse.json({ received: true });
}

// -----------------------------------------------------------------------------
// Assinatura
// -----------------------------------------------------------------------------

function verifySignature(raw: string, header: string | null): boolean {
    const appSecret = process.env.META_APP_SECRET?.trim();

    // Sem segredo configurado o webhook fica fechado — evita aceitar eventos forjados
    if (!appSecret) {
        console.error("[Meta Webhook] META_APP_SECRET não configurado");
        return false;
    }

    if (!header?.startsWith("sha256=")) return false;

    const expected = createHmac("sha256", appSecret).update(raw, "utf8").digest();
    const received = Buffer.from(header.slice("sha256=".length), "hex");

    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
}

// -----------------------------------------------------------------------------
// Eventos
// -----------------------------------------------------------------------------

async function handleDeliveryStatus(status: MetaStatus): Promise<void> {
    if (!status.id) return;

    const supabase = createAdminClient();

    const { data: job } = await supabase
        .from("message_outbox")
        .select("id, appointment_id, kind, channel")
        .eq("provider_message_id", status.id)
        .maybeSingle();

    if (!job) return;

    if (status.status === "failed") {
        const detail =
            status.errors?.map((e) => `[${e.code}] ${e.title || e.message}`).join("; ") ||
            "Entrega recusada pela Meta";

        await supabase
            .from("message_outbox")
            .update({ status: "failed", provider_status: "failed", error: detail })
            .eq("id", job.id);

        // Paciente não recebeu no WhatsApp: garante o e-mail
        if (job.appointment_id) {
            await enqueueAppointmentMessage({
                appointmentId: job.appointment_id,
                kind: job.kind,
                channels: ["email"],
                supabase,
            });
        }
        return;
    }

    await supabase
        .from("message_outbox")
        .update({ provider_status: status.status })
        .eq("id", job.id);
}

/**
 * Resposta de texto do paciente. Não confirma nem reagenda: só devolve o link
 * correto, deixando explícito que o canal não é atendido por humanos.
 */
async function handleInboundMessage(message: MetaMessage): Promise<void> {
    if (message.id) {
        await markMessageAsRead(message.id);
    }

    const from = message.from;
    if (!from) return;

    const supabase = createAdminClient();
    const e164 = `+${from.replace(/\D/g, "")}`;

    const { data: patient } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("phone_e164", e164)
        .maybeSingle();

    if (!patient) return;

    const { data: appointment } = await supabase
        .from("appointments")
        .select("confirmation_token")
        .eq("patient_id", patient.id)
        .in("status", ["scheduled", "confirmed"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    const link = appointment?.confirmation_token
        ? buildAppointmentConfirmationUrl(appointment.confirmation_token)
        : null;

    await sendText({
        to: from,
        text: link
            ? `Olá! Este canal é automático e não é monitorado.\n\nPara confirmar, reagendar ou ver os detalhes da sua sessão, use o link seguro:\n${link}`
            : "Olá! Este canal é automático e não é monitorado. Fale diretamente com seu profissional para tratar do agendamento.",
    });
}

// -----------------------------------------------------------------------------
// Tipos do payload da Meta
// -----------------------------------------------------------------------------

interface MetaWebhookBody {
    object?: string;
    entry?: Array<{
        id?: string;
        changes?: Array<{
            field?: string;
            value?: {
                messaging_product?: string;
                statuses?: MetaStatus[];
                messages?: MetaMessage[];
            };
        }>;
    }>;
}

interface MetaStatus {
    id?: string;
    status?: "sent" | "delivered" | "read" | "failed";
    timestamp?: string;
    recipient_id?: string;
    errors?: Array<{ code?: number; title?: string; message?: string }>;
}

interface MetaMessage {
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
}
