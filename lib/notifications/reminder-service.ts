import { createClient } from "@supabase/supabase-js";
import { sendEmail, generateReminderEmailHtml } from "@/lib/google/gmail";
import { sendWhatsAppMessage, generateReminderMessage } from "@/lib/whatsapp/client";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface AppointmentWithRelations {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    type: "in_person" | "telehealth";
    status: string;
    confirmation_token: string;
    reminder_sent_at: string | null;
    patients: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
    } | null;
    professionals: {
        id: string;
        full_name: string;
        google_refresh_token: string | null;
        google_calendar_connected: boolean | null;
        whatsapp_connected_at: string | null;
    } | null;
}

export async function sendReminders(reminderType: "24h" | "2h"): Promise<{
    sent: number;
    failed: number;
    errors: string[];
}> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    // Calculate time window based on reminder type
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    if (reminderType === "24h") {
        startTime = addHours(now, 23);
        endTime = addHours(now, 25);
    } else {
        startTime = addHours(now, 1.5);
        endTime = addHours(now, 2.5);
    }

    // Fetch appointments that need reminders
    const { data: appointments, error: fetchError } = await supabase
        .from("appointments")
        .select(`
            id,
            scheduled_at,
            duration_minutes,
            type,
            status,
            confirmation_token,
            reminder_sent_at,
            patients (
                id,
                full_name,
                email,
                phone
            ),
            professionals (
                id,
                full_name,
                google_refresh_token,
                google_calendar_connected,
                whatsapp_connected_at
            )
        `)
        .gte("scheduled_at", startTime.toISOString())
        .lte("scheduled_at", endTime.toISOString())
        .in("status", ["scheduled", "confirmed"])
        .is("reminder_sent_at", null);

    if (fetchError) {
        console.error("Error fetching appointments for reminders:", fetchError);
        return { ...results, errors: [fetchError.message] };
    }

    if (!appointments || appointments.length === 0) {
        return results;
    }

    // Cast appointments to typed array
    const typedAppointments = appointments as unknown as AppointmentWithRelations[];

    // Get settings for each professional
    const professionalIds = [...new Set(typedAppointments.map((a) => a.professionals?.id).filter(Boolean))];
    
    const { data: settingsData } = await supabase
        .from("settings")
        .select("professional_id, reminder_24h, reminder_2h, reminder_channel")
        .in("professional_id", professionalIds);

    const settingsMap = new Map(
        (settingsData || []).map((s: { professional_id: string; reminder_24h: boolean; reminder_2h: boolean; reminder_channel: string }) => [s.professional_id, s])
    );

    // Process each appointment
    for (const appointment of typedAppointments) {
        try {
            const professional = appointment.professionals;
            const patient = appointment.patients;

            if (!professional || !patient) {
                continue;
            }

            const settings = settingsMap.get(professional.id) || {
                reminder_24h: true,
                reminder_2h: false,
                reminder_channel: "whatsapp_email",
            };

            // Check if this reminder type is enabled
            if (reminderType === "24h" && !settings.reminder_24h) continue;
            if (reminderType === "2h" && !settings.reminder_2h) continue;

            const scheduledDate = new Date(appointment.scheduled_at);
            const formattedDate = format(scheduledDate, "EEEE, d 'de' MMMM", { locale: ptBR });
            const formattedTime = format(scheduledDate, "HH:mm");

            const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${appointment.confirmation_token}`;

            let sent = false;

            // Try WhatsApp first if enabled
            if (
                (settings.reminder_channel === "whatsapp_email" || 
                 settings.reminder_channel === "whatsapp_only") &&
                professional.whatsapp_connected_at &&
                patient.phone
            ) {
                try {
                    const result = await sendWhatsAppMessage(
                        professional.id,
                        patient.phone,
                        generateReminderMessage({
                            patientName: patient.full_name,
                            professionalName: professional.full_name,
                            date: formattedDate,
                            time: formattedTime,
                            type: appointment.type,
                            confirmationLink,
                        })
                    );

                    if (result.success) {
                        sent = true;
                    }
                } catch (whatsappError: any) {
                    console.error(`WhatsApp error for appointment ${appointment.id}:`, whatsappError);
                }
            }

            // Try email if WhatsApp failed or email_only
            if (
                !sent &&
                (settings.reminder_channel === "whatsapp_email" || 
                 settings.reminder_channel === "email_only") &&
                professional.google_refresh_token &&
                patient.email
            ) {
                try {
                    const result = await sendEmail(
                        professional.google_refresh_token,
                        {
                            to: patient.email,
                            subject: `Lembrete: Sessão ${reminderType === "24h" ? "amanhã" : "em 2 horas"} - ${formattedTime}`,
                            html: generateReminderEmailHtml({
                                patientName: patient.full_name,
                                professionalName: professional.full_name,
                                date: formattedDate,
                                time: formattedTime,
                                type: appointment.type,
                                confirmationLink,
                            }),
                        }
                    );

                    if (result.success) {
                        sent = true;
                    }
                } catch (emailError: any) {
                    console.error(`Email error for appointment ${appointment.id}:`, emailError);
                }
            }

            if (sent) {
                // Mark as sent
                await supabase
                    .from("appointments")
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .eq("id", appointment.id);

                results.sent++;
            } else {
                results.failed++;
                results.errors.push(`Failed to send reminder for appointment ${appointment.id}`);
            }
        } catch (appointmentError: any) {
            results.failed++;
            results.errors.push(`Error processing appointment ${appointment.id}: ${appointmentError.message}`);
        }
    }

    return results;
}

