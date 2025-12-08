"use server";

import { createClient } from "@/lib/supabase/server";
import { addMinutes, parseISO } from "date-fns";

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

    // Get professional ID
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Construct timestamps
    const [hours, minutes] = data.time.split(':').map(Number);
    const scheduledAt = new Date(data.date);
    scheduledAt.setHours(hours, minutes, 0, 0);
    const scheduledEnd = addMinutes(scheduledAt, data.duration);

    // Check availability (Overlaps)
    // Overlap: (StartA < EndB) and (EndA > StartB)
    const { data: conflicts } = await supabase
        .from("appointments")
        .select("id")
        .eq("professional_id", professional.id)
        .neq("status", "cancelled")
        .lt("scheduled_at", scheduledEnd.toISOString())
        .gt("scheduled_end_at", scheduledAt.toISOString()) // Assuming we have a computed column or we compute it? 
    // Wait, usually we store start + duration.
    // If we only store start and duration, we have to rely on a function or check manually.
    // Let's assume for MVP we fetch nearby appointments and check in memory if we don't have a range type or computed column.

    // Actually, let's fetch appointments for that day to be safe and simple
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

    // Insert
    const { error } = await supabase.from("appointments").insert({
        professional_id: professional.id,
        patient_id: data.patientId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: data.duration,
        type: data.type,
        telehealth_provider: data.type === 'telehealth' ? 'native' : null,
        status: 'scheduled',
        timezone: 'America/Sao_Paulo'
        // Note: If we added `scheduled_end_at` column it would be easier for querying, but let's stick to schema
    });

    if (error) throw error;
    return { success: true };
}
