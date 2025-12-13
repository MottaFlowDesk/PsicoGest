import { createClient } from "@/lib/supabase/client";
import { addMinutes, format, setHours, setMinutes } from "date-fns";

export interface TimeSlot {
    start: string; // HH:mm
    end: string; // HH:mm
}

export interface DayAvailability {
    enabled: boolean;
    slots: TimeSlot[];
}

export interface WeeklyAvailability {
    [key: number]: DayAvailability; // 0 = Sunday, 1 = Monday, etc.
}

export interface AvailabilityException {
    date: string;
    is_available: boolean;
    start_time?: string;
    end_time?: string;
    reason?: string;
}

// Get available time slots for a specific date
export async function getAvailableSlots(
    professionalId: string,
    date: Date,
    duration: number = 50
): Promise<TimeSlot[]> {
    const supabase = createClient();
    const dayOfWeek = date.getDay(); // 0 = Sunday

    // 1. Get weekly availability for this day
    const { data: availability } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .single();

    if (!availability) {
        return []; // Professional doesn't work this day
    }

    // 2. Check for exceptions on this date
    const dateStr = format(date, "yyyy-MM-dd");
    const { data: exception } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("override_date", dateStr)
        .single();

    // If there's an exception marking the day as unavailable, return empty
    if (exception && !exception.is_available) {
        return [];
    }

    // Use exception times if available, otherwise use weekly availability
    const startTime = exception?.start_time || availability.start_time;
    const endTime = exception?.end_time || availability.end_time;

    // 3. Get existing appointments for this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: appointments } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes")
        .eq("professional_id", professionalId)
        .neq("status", "cancelled")
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString());

    // 4. Generate available slots
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    let currentTime = setMinutes(setHours(date, startHour), startMin);
    const dayEndTime = setMinutes(setHours(date, endHour), endMin);

    while (currentTime < dayEndTime) {
        const slotEnd = addMinutes(currentTime, duration);

        // Check if slot fits within working hours
        if (slotEnd > dayEndTime) break;

        // Check if slot conflicts with existing appointments
        const hasConflict = appointments?.some(apt => {
            const aptStart = new Date(apt.scheduled_at);
            const aptEnd = addMinutes(aptStart, apt.duration_minutes);

            return (
                (currentTime >= aptStart && currentTime < aptEnd) ||
                (slotEnd > aptStart && slotEnd <= aptEnd) ||
                (currentTime <= aptStart && slotEnd >= aptEnd)
            );
        });

        if (!hasConflict) {
            slots.push({
                start: format(currentTime, "HH:mm"),
                end: format(slotEnd, "HH:mm"),
            });
        }

        // Move to next slot (using the duration as interval)
        currentTime = addMinutes(currentTime, duration);
    }

    return slots;
}

// Check if a specific time slot is available
export async function isTimeSlotAvailable(
    professionalId: string,
    date: Date,
    time: string,
    duration: number = 50
): Promise<{ available: boolean; reason?: string }> {
    const supabase = createClient();
    const dayOfWeek = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");

    // 1. Check for exceptions (holidays, etc.)
    const { data: exception } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("override_date", dateStr)
        .single();

    if (exception && !exception.is_available) {
        return {
            available: false,
            reason: exception.reason || "Profissional indisponível nesta data",
        };
    }

    // 2. Check weekly availability
    const { data: availability } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .single();

    if (!availability) {
        return {
            available: false,
            reason: "Profissional não atende neste dia da semana",
        };
    }

    // Use exception times if available
    const workStart = exception?.start_time || availability.start_time;
    const workEnd = exception?.end_time || availability.end_time;

    // Check if requested time is within working hours
    const [workStartH, workStartM] = workStart.split(":").map(Number);
    const [workEndH, workEndM] = workEnd.split(":").map(Number);
    const [requestedH, requestedM] = time.split(":").map(Number);

    const requestedMinutes = requestedH * 60 + requestedM;
    const workStartMinutes = workStartH * 60 + workStartM;
    const workEndMinutes = workEndH * 60 + workEndM;

    if (requestedMinutes < workStartMinutes || requestedMinutes + duration > workEndMinutes) {
        return {
            available: false,
            reason: `Horário fora do expediente (${workStart} - ${workEnd})`,
        };
    }

    // 3. Check for conflicts with existing appointments
    const [hours, minutes] = time.split(":").map(Number);
    const requestedStart = new Date(date);
    requestedStart.setHours(hours, minutes, 0, 0);
    const requestedEnd = addMinutes(requestedStart, duration);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: appointments } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes, patients(full_name)")
        .eq("professional_id", professionalId)
        .neq("status", "cancelled")
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString());

    const conflict = appointments?.find(apt => {
        const aptStart = new Date(apt.scheduled_at);
        const aptEnd = addMinutes(aptStart, apt.duration_minutes);

        return requestedStart < aptEnd && requestedEnd > aptStart;
    });

    if (conflict) {
        const aptTime = format(new Date(conflict.scheduled_at), "HH:mm");
        return {
            available: false,
            reason: `Conflito com agendamento às ${aptTime}`,
        };
    }

    return { available: true };
}
