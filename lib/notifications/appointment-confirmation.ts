import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueAppointmentMessage, processOutbox } from "@/lib/messaging/outbox";

/**
 * Enfileira a confirmação do agendamento (WhatsApp da plataforma + e-mail) e
 * tenta entregar na hora. Se a entrega falhar, o job fica na outbox e o worker
 * /api/cron/process-outbox reprocessa com backoff.
 */
export async function sendAppointmentConfirmation(appointmentId: string): Promise<{
    sent: boolean;
    channel?: "email" | "whatsapp" | "both";
    error?: string;
}> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { sent: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
    }

    const supabase = createAdminClient();

    const { data: appointment } = await supabase
        .from("appointments")
        .select("confirmation_sent_at")
        .eq("id", appointmentId)
        .single();

    if (appointment?.confirmation_sent_at) {
        return { sent: true };
    }

    const { queued, skipped } = await enqueueAppointmentMessage({
        appointmentId,
        kind: "confirmation",
        supabase,
    });

    if (queued.length === 0) {
        // Nada elegível: pode ser job já existente na fila de uma tentativa anterior
        const { count } = await supabase
            .from("message_outbox")
            .select("id", { count: "exact", head: true })
            .eq("appointment_id", appointmentId)
            .eq("kind", "confirmation")
            .in("status", ["queued", "sending"]);

        if (!count) {
            return {
                sent: false,
                error: skipped.length
                    ? skipped.join("; ")
                    : "Nenhum canal disponível para enviar a confirmação",
            };
        }
    }

    // Entrega imediata para o paciente não esperar o próximo ciclo do cron
    const result = await processOutbox({ batchSize: 5 });

    const { data: rows } = await supabase
        .from("message_outbox")
        .select("channel, status, error")
        .eq("appointment_id", appointmentId)
        .eq("kind", "confirmation");

    const sentChannels = (rows ?? [])
        .filter((row) => row.status === "sent")
        .map((row) => row.channel as "whatsapp" | "email");

    if (sentChannels.length > 0) {
        return {
            sent: true,
            channel:
                sentChannels.length > 1
                    ? "both"
                    : sentChannels[0] === "whatsapp"
                      ? "whatsapp"
                      : "email",
        };
    }

    const pending = (rows ?? []).some((row) => row.status === "queued");
    if (pending) {
        return {
            sent: false,
            error: "Envio em fila — será entregue automaticamente em instantes",
        };
    }

    const failures = (rows ?? [])
        .map((row) => row.error)
        .filter((message): message is string => !!message);

    return {
        sent: false,
        error:
            failures.join("; ") ||
            result.errors.join("; ") ||
            skipped.join("; ") ||
            "Não foi possível enviar a confirmação",
    };
}
