"use server";

import { createClient } from "@/lib/supabase/server";
import { addMinutes, format } from "date-fns";
import { revalidatePath } from "next/cache";
import {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    checkAvailability,
} from "@/lib/google/calendar";
import {
    buildAppointmentTimestamp,
    getDayBoundsISO,
    getTodayDateString,
} from "@/lib/datetime/local-date";

export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export async function createAppointment(data: {
    patientId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    duration: number; // minutes
    type: "in_person" | "telehealth";
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Get professional with Google credentials
    const { data: professional } = await supabase
        .from("professionals")
        .select("id, google_calendar_connected, google_refresh_token")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Get patient info for calendar event
    const { data: patient } = await supabase
        .from("patients")
        .select("full_name, email")
        .eq("id", data.patientId)
        .single();

    // Horário em America/Sao_Paulo (evita deslocamento de 1 dia no servidor UTC)
    const scheduledAt = buildAppointmentTimestamp(data.date, data.time);
    
    // Ensure the date is in the future
    // For today, require at least 1 hour from now
    // For future dates, just ensure it's not in the past
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const isToday = data.date === getTodayDateString();
    
    if (isToday && scheduledAt < oneHourFromNow) {
        throw new Error("Para agendamentos hoje, o horário deve ser pelo menos 1 hora a partir de agora.");
    } else if (!isToday && scheduledAt <= now) {
        throw new Error("Não é possível agendar no passado. Por favor, selecione uma data e horário futuros.");
    }
    
    const scheduledEnd = addMinutes(scheduledAt, data.duration);

    // Fetch appointments for that day to check conflicts
    const { start: dayStartISO, end: dayEndISO } = getDayBoundsISO(data.date);

    const { data: daysAppointments } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes")
        .eq("professional_id", professional.id)
        .neq("status", "cancelled")
        .gte("scheduled_at", dayStartISO)
        .lte("scheduled_at", dayEndISO);

    const hasConflict = daysAppointments?.some(apt => {
        const aptStart = new Date(apt.scheduled_at);
        const aptEnd = addMinutes(aptStart, apt.duration_minutes);
        return (scheduledAt < aptEnd && scheduledEnd > aptStart);
    });

    if (hasConflict) {
        throw new Error("Horário indisponível! Já existe um agendamento neste período.");
    }

    // Check Google Calendar availability if connected
    if (professional.google_calendar_connected && professional.google_refresh_token) {
        try {
            const isAvailable = await checkAvailability(
                professional.google_refresh_token,
                scheduledAt,
                scheduledEnd
            );
            if (!isAvailable) {
                throw new Error("Horário conflita com um evento no seu Google Calendar.");
            }
        } catch (googleError: any) {
            // Log but don't block if Google check fails
            console.error("Google Calendar check failed:", googleError);
        }
    }

    // Insert appointment
    // The validation above already ensures scheduled_at is in the future
    // The constraint requires scheduled_at > created_at, which is satisfied by the buffer check above
    
    const { randomBytes } = await import("crypto");
    const confirmationToken = randomBytes(32).toString("hex");

    const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
            professional_id: professional.id,
            patient_id: data.patientId,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: data.duration,
            type: data.type,
            telehealth_provider: data.type === "telehealth" ? "google_meet" : null,
            status: "scheduled",
            timezone: "America/Sao_Paulo",
            confirmation_token: confirmationToken,
        })
        .select("id, confirmation_token")
        .single();

    if (error) throw error;

    let confirmationSent = false;
    let confirmationError: string | undefined;

    try {
        const { sendAppointmentConfirmation } = await import(
            "@/lib/notifications/appointment-confirmation"
        );
        const confirmationResult = await sendAppointmentConfirmation(appointment.id);
        confirmationSent = confirmationResult.sent;
        confirmationError = confirmationResult.error;
        if (!confirmationResult.sent) {
            console.warn(
                "Confirmação não enviada ao paciente:",
                confirmationResult.error
            );
        }
    } catch (err) {
        console.error("Failed to send appointment confirmation:", err);
        confirmationError =
            err instanceof Error ? err.message : "Erro ao enviar confirmação";
    }

    // Google Calendar (+ Meet para teleconsulta)
    if (professional.google_calendar_connected && professional.google_refresh_token && patient) {
        try {
            const isTelehealth = data.type === "telehealth";
            const { buildAppointmentConfirmationUrl } = await import(
                "@/lib/app/public-url"
            );
            const confirmUrl = buildAppointmentConfirmationUrl(confirmationToken);

            const result = await createCalendarEvent(
                professional.google_refresh_token,
                {
                    summary: `Sessão com ${patient.full_name}`,
                    description: [
                        `Agendamento PsicoGuest - ${isTelehealth ? "Online (Google Meet)" : "Presencial"}`,
                        "",
                        `Confirme sua presença: ${confirmUrl}`,
                    ].join("\n"),
                    startTime: scheduledAt,
                    endTime: scheduledEnd,
                    createMeet: isTelehealth,
                    // Convite do Calendar só após o paciente confirmar (e-mail usa template PsicoGuest)
                    sendInvitation: false,
                }
            );

            if (result.eventId) {
                const calendarUpdate: Record<string, string | null> = {
                    google_calendar_event_id: result.eventId,
                };
                if (isTelehealth && result.meetLink) {
                    calendarUpdate.meeting_link = result.meetLink;
                    calendarUpdate.meet_created_at = new Date().toISOString();
                }

                await supabase
                    .from("appointments")
                    .update(calendarUpdate)
                    .eq("id", appointment.id);
            }
        } catch (googleError) {
            console.error("Failed to create Google Calendar event:", googleError);
        }
    }

    // Create notification for appointment creation
    if (patient) {
        try {
            const { notifyAppointmentCreated } = await import("@/lib/notifications/appointment-notifications");
            await notifyAppointmentCreated(professional.id, {
                patientName: patient.full_name,
                appointmentDate: scheduledAt.toISOString(),
                appointmentTime: data.time,
                appointmentId: appointment.id,
            });
        } catch (notificationError) {
            // Log but don't fail the appointment creation
            console.error("Failed to create appointment notification:", notificationError);
        }
    }
    
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");
    
    return {
        success: true,
        appointmentId: appointment.id,
        confirmationSent,
        confirmationError,
    };
}

export async function updateAppointment(data: {
    appointmentId: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:MM
    duration?: number;
    type?: "in_person" | "telehealth";
    notes?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id, google_calendar_connected, google_refresh_token")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Verify ownership and get Google event ID
    const { data: existing } = await supabase
        .from("appointments")
        .select("professional_id, status, scheduled_at, duration_minutes, google_calendar_event_id")
        .eq("id", data.appointmentId)
        .single();

    if (!existing || existing.professional_id !== professional.id) {
        throw new Error("Appointment not found or access denied");
    }

    if (existing.status === "cancelled" || existing.status === "completed") {
        throw new Error("Cannot edit a cancelled or completed appointment");
    }

    const updateData: any = {};
    let newScheduledAt: Date | null = null;
    let newScheduledEnd: Date | null = null;

    if (data.date && data.time) {
        newScheduledAt = buildAppointmentTimestamp(data.date, data.time);
        const duration = data.duration || existing.duration_minutes;
        newScheduledEnd = addMinutes(newScheduledAt, duration);

        // Check conflicts (excluding this appointment)
        const { start: dayStartISO, end: dayEndISO } = getDayBoundsISO(data.date);

        const { data: daysAppointments } = await supabase
            .from("appointments")
            .select("id, scheduled_at, duration_minutes")
            .eq("professional_id", professional.id)
            .neq("status", "cancelled")
            .neq("id", data.appointmentId)
            .gte("scheduled_at", dayStartISO)
            .lte("scheduled_at", dayEndISO);

        const hasConflict = daysAppointments?.some(apt => {
            const aptStart = new Date(apt.scheduled_at);
            const aptEnd = addMinutes(aptStart, apt.duration_minutes);
            return (newScheduledAt! < aptEnd && newScheduledEnd! > aptStart);
        });

        if (hasConflict) {
            throw new Error("Horário indisponível! Já existe um agendamento neste período.");
        }

        updateData.scheduled_at = newScheduledAt.toISOString();
    }

    if (data.duration) updateData.duration_minutes = data.duration;
    if (data.type) {
        updateData.type = data.type;
        updateData.telehealth_provider = data.type === 'telehealth' ? 'native' : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", data.appointmentId);

    if (error) throw error;

    // Update Google Calendar event if connected and event exists
    if (
        professional.google_calendar_connected && 
        professional.google_refresh_token && 
        existing.google_calendar_event_id &&
        newScheduledAt &&
        newScheduledEnd
    ) {
        try {
            await updateCalendarEvent(
                professional.google_refresh_token,
                existing.google_calendar_event_id,
                {
                    startTime: newScheduledAt,
                    endTime: newScheduledEnd,
                }
            );
        } catch (googleError) {
            console.error("Failed to update Google Calendar event:", googleError);
        }
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return { success: true };
}

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    reason?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id, google_calendar_connected, google_refresh_token")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Verify ownership and get Google event ID
    const { data: existing } = await supabase
        .from("appointments")
        .select("professional_id, status, google_calendar_event_id")
        .eq("id", appointmentId)
        .single();

    if (!existing || existing.professional_id !== professional.id) {
        throw new Error("Appointment not found or access denied");
    }

    const updateData: any = { status };

    if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = "professional";
        updateData.cancellation_reason = reason || null;

        // Delete Google Calendar event if exists
        if (
            professional.google_calendar_connected && 
            professional.google_refresh_token && 
            existing.google_calendar_event_id
        ) {
            try {
                await deleteCalendarEvent(
                    professional.google_refresh_token,
                    existing.google_calendar_event_id
                );
            } catch (googleError) {
                console.error("Failed to delete Google Calendar event:", googleError);
            }
        }
    }

    if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
    }

    if (status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointmentId)
        .select("id, status, professional_id")
        .single();

    if (error) throw error;

    if (updated?.professional_id) {
        try {
            const { broadcastAppointmentStatus } = await import(
                "@/lib/realtime/appointment-status-broadcast"
            );
            await broadcastAppointmentStatus(
                updated.professional_id,
                updated.id,
                updated.status
            );
        } catch (broadcastError) {
            console.error("Failed to broadcast appointment status:", broadcastError);
        }
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return { success: true };
}

export async function confirmAppointment(appointmentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Get appointment with patient info
    const { data: appointment } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                full_name
            )
        `)
        .eq("id", appointmentId)
        .single();

    const result = await updateAppointmentStatus(appointmentId, "confirmed");

    // Create notification for appointment confirmation
    if (appointment && appointment.patients) {
        try {
            const { notifyAppointmentConfirmed } = await import("@/lib/notifications/appointment-notifications");
            const appointmentDate = new Date(appointment.scheduled_at);
            await notifyAppointmentConfirmed(professional.id, {
                patientName: (appointment.patients as any).full_name,
                appointmentDate: appointmentDate.toISOString(),
                appointmentTime: format(appointmentDate, "HH:mm"),
                appointmentId: appointment.id,
            });
        } catch (notificationError) {
            console.error("Failed to create confirmation notification:", notificationError);
        }
    }

    return result;
}

export async function completeAppointment(appointmentId: string) {
    return updateAppointmentStatus(appointmentId, "completed");
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Get appointment with patient info
    const { data: appointment } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                full_name
            )
        `)
        .eq("id", appointmentId)
        .single();

    const result = await updateAppointmentStatus(appointmentId, "cancelled", reason);

    // Create notification for appointment cancellation
    if (appointment && appointment.patients) {
        try {
            const { notifyAppointmentCancelled } = await import("@/lib/notifications/appointment-notifications");
            const appointmentDate = new Date(appointment.scheduled_at);
            await notifyAppointmentCancelled(professional.id, {
                patientName: (appointment.patients as any).full_name,
                appointmentDate: appointmentDate.toISOString(),
                appointmentTime: format(appointmentDate, "HH:mm"),
                appointmentId: appointment.id,
            });
        } catch (notificationError) {
            console.error("Failed to create cancellation notification:", notificationError);
        }
    }

    return result;
}

export async function markAsNoShow(appointmentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Get appointment with patient info
    const { data: appointment } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                full_name
            )
        `)
        .eq("id", appointmentId)
        .single();

    const result = await updateAppointmentStatus(appointmentId, "no_show");

    // Create notification for no-show
    if (appointment && appointment.patients) {
        try {
            const { notifyAppointmentNoShow } = await import("@/lib/notifications/appointment-notifications");
            const appointmentDate = new Date(appointment.scheduled_at);
            await notifyAppointmentNoShow(professional.id, {
                patientName: (appointment.patients as any).full_name,
                appointmentDate: appointmentDate.toISOString(),
                appointmentTime: format(appointmentDate, "HH:mm"),
                appointmentId: appointment.id,
            });
        } catch (notificationError) {
            console.error("Failed to create no-show notification:", notificationError);
        }
    }

    return result;
}

export async function getAppointment(appointmentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                id,
                full_name,
                phone,
                email
            )
        `)
        .eq("id", appointmentId)
        .single();

    if (error) throw error;

    return data;
}
