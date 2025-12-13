"use server";

import { createClient } from "@/lib/supabase/server";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, checkAvailability } from "@/lib/google/calendar";

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

    // Construct timestamps
    const [hours, minutes] = data.time.split(':').map(Number);
    const scheduledAt = new Date(data.date);
    scheduledAt.setHours(hours, minutes, 0, 0);
    const scheduledEnd = addMinutes(scheduledAt, data.duration);

    // Fetch appointments for that day to check conflicts
    const dayStart = new Date(data.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(data.date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: daysAppointments } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes")
        .eq("professional_id", professional.id)
        .neq("status", "cancelled")
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString());

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
    const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
            professional_id: professional.id,
            patient_id: data.patientId,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: data.duration,
            type: data.type,
            telehealth_provider: data.type === 'telehealth' ? 'native' : null,
            status: 'scheduled',
            timezone: 'America/Sao_Paulo'
        })
        .select("id")
        .single();

    if (error) throw error;

    // Create Google Calendar event if connected
    if (professional.google_calendar_connected && professional.google_refresh_token && patient) {
        try {
            const result = await createCalendarEvent(
                professional.google_refresh_token,
                {
                    summary: `Sessão com ${patient.full_name}`,
                    description: `Agendamento PsicoGest - ${data.type === 'telehealth' ? 'Online' : 'Presencial'}`,
                    startTime: scheduledAt,
                    endTime: scheduledEnd,
                    attendeeEmail: patient.email || undefined,
                    createMeet: false, // Meet is created on confirmation
                }
            );

            // Save Google Calendar event ID
            if (result.eventId) {
                await supabase
                    .from("appointments")
                    .update({ google_calendar_event_id: result.eventId })
                    .eq("id", appointment.id);
            }
        } catch (googleError) {
            // Log but don't fail the appointment creation
            console.error("Failed to create Google Calendar event:", googleError);
        }
    }
    
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");
    
    return { success: true };
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
        const [hours, minutes] = data.time.split(':').map(Number);
        newScheduledAt = new Date(data.date);
        newScheduledAt.setHours(hours, minutes, 0, 0);
        const duration = data.duration || existing.duration_minutes;
        newScheduledEnd = addMinutes(newScheduledAt, duration);

        // Check conflicts (excluding this appointment)
        const dayStart = new Date(data.date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(data.date);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: daysAppointments } = await supabase
            .from("appointments")
            .select("id, scheduled_at, duration_minutes")
            .eq("professional_id", professional.id)
            .neq("status", "cancelled")
            .neq("id", data.appointmentId)
            .gte("scheduled_at", dayStart.toISOString())
            .lte("scheduled_at", dayEnd.toISOString());

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

    const { error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointmentId);

    if (error) throw error;

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return { success: true };
}

export async function confirmAppointment(appointmentId: string) {
    return updateAppointmentStatus(appointmentId, "confirmed");
}

export async function completeAppointment(appointmentId: string) {
    return updateAppointmentStatus(appointmentId, "completed");
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
    return updateAppointmentStatus(appointmentId, "cancelled", reason);
}

export async function markAsNoShow(appointmentId: string) {
    return updateAppointmentStatus(appointmentId, "no_show");
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
