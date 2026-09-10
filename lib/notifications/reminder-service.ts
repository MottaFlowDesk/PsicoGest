import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueAppointmentMessage, processOutbox } from "@/lib/messaging/outbox";
import { addHours, format } from "date-fns";

interface ReminderAppointment {
    id: string;
    scheduled_at: string;
    professional_id: string;
    patients: { full_name: string } | { full_name: string }[] | null;
}

export interface SendRemindersResult {
    /** Jobs criados na fila nesta execução. */
    queued: number;
    /** Mensagens efetivamente entregues pelo worker. */
    sent: number;
    failed: number;
    skipped: string[];
    errors: string[];
}

/**
 * Enfileira lembretes da janela correspondente.
 *
 * A idempotência vem do índice único (appointment_id, channel, kind) da
 * message_outbox — por isso não filtramos mais por reminder_sent_at, o que
 * antes impedia o lembrete de 2h depois que o de 24h já tinha saído.
 */
export async function sendReminders(
    reminderType: "24h" | "2h"
): Promise<SendRemindersResult> {
    const supabase = createAdminClient();
    const result: SendRemindersResult = {
        queued: 0,
        sent: 0,
        failed: 0,
        skipped: [],
        errors: [],
    };

    const now = new Date();
    const startTime = reminderType === "24h" ? addHours(now, 23) : addHours(now, 1.5);
    const endTime = reminderType === "24h" ? addHours(now, 25) : addHours(now, 2.5);

    const { data: appointments, error: fetchError } = await supabase
        .from("appointments")
        .select("id, scheduled_at, professional_id, patients ( full_name )")
        .gte("scheduled_at", startTime.toISOString())
        .lte("scheduled_at", endTime.toISOString())
        .in("status", ["scheduled", "confirmed"]);

    if (fetchError) {
        return { ...result, errors: [fetchError.message] };
    }

    if (!appointments?.length) {
        return result;
    }

    const rows = appointments as unknown as ReminderAppointment[];
    const professionalIds = [...new Set(rows.map((a) => a.professional_id))];

    const { data: settingsData } = await supabase
        .from("settings")
        .select("professional_id, reminder_24h, reminder_2h")
        .in("professional_id", professionalIds);

    const settingsMap = new Map(
        (settingsData ?? []).map((s) => [s.professional_id, s])
    );

    const kind = reminderType === "24h" ? "reminder_24h" : "reminder_2h";

    for (const appointment of rows) {
        const settings = settingsMap.get(appointment.professional_id) ?? {
            reminder_24h: true,
            reminder_2h: false,
        };

        if (reminderType === "24h" && !settings.reminder_24h) continue;
        if (reminderType === "2h" && !settings.reminder_2h) continue;

        try {
            const { queued, skipped } = await enqueueAppointmentMessage({
                appointmentId: appointment.id,
                kind,
                supabase,
            });

            result.queued += queued.length;
            result.skipped.push(...skipped);

            // Aviso in-app do profissional só na primeira vez que o job é criado
            if (queued.length > 0 && reminderType === "2h") {
                await notifyProfessional(appointment);
            }
        } catch (error) {
            result.failed++;
            result.errors.push(
                `Agendamento ${appointment.id}: ${
                    error instanceof Error ? error.message : "erro ao enfileirar"
                }`
            );
        }
    }

    if (result.queued > 0) {
        const worker = await processOutbox({ batchSize: Math.min(result.queued, 50) });
        result.sent = worker.sent;
        result.failed += worker.failed;
        result.errors.push(...worker.errors);
    }

    return result;
}

async function notifyProfessional(appointment: ReminderAppointment): Promise<void> {
    const patient = Array.isArray(appointment.patients)
        ? appointment.patients[0]
        : appointment.patients;

    if (!patient) return;

    try {
        const { notifyAppointmentUpcoming } = await import("./appointment-notifications");
        await notifyAppointmentUpcoming(appointment.professional_id, {
            patientName: patient.full_name,
            appointmentDate: appointment.scheduled_at,
            appointmentTime: format(new Date(appointment.scheduled_at), "HH:mm"),
            appointmentId: appointment.id,
        });
    } catch (error) {
        console.error("Falha ao notificar profissional sobre sessão próxima:", error);
    }
}
