import { createClient } from "@/lib/supabase/client";
import { addMinutes, format, setHours, setMinutes } from "date-fns";
import { endOfLocalDay, getTodayDateString, startOfLocalDay, toDateInputValue } from "@/lib/datetime/local-date";

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

    // 1. Check for exceptions on this date first (holidays, blocks, etc.)
    const dateStr = format(date, "yyyy-MM-dd");
    const { data: exception, error: exceptionError } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("date", dateStr)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no exception exists

    // If there's an exception marking the day as unavailable (all_day = true), return empty
    if (exception && exception.all_day) {
        console.log(`[getAvailableSlots] Day ${dateStr} is blocked by exception`);
        return [];
    }

    // 2. Get weekly availability for this day
    const { data: availability, error: availabilityError } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle(); // Use maybeSingle instead of single

    if (availabilityError) {
        console.error("[getAvailableSlots] Error fetching availability:", availabilityError);
    }

    if (!availability) {
        console.log(`[getAvailableSlots] No availability configured for day ${dayOfWeek} (${dateStr})`);
        return []; // Professional doesn't work this day
    }

    // Use exception times if available and not all_day, otherwise use weekly availability
    const startTime = (exception && !exception.all_day && exception.start_time) 
        ? exception.start_time 
        : availability.start_time;
    const endTime = (exception && !exception.all_day && exception.end_time) 
        ? exception.end_time 
        : availability.end_time;

    // 3. Get existing appointments for this date (limites no fuso local)
    const dayStart = startOfLocalDay(date);
    const dayEnd = endOfLocalDay(date);

    const { data: appointments } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes, status")
        .eq("professional_id", professionalId)
        .in("status", ["scheduled", "confirmed", "completed", "no_show"]) // Only cancelled appointments don't block slots
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString());

    // 4. Generate available slots
    const slots: TimeSlot[] = [];
    
    // Parse time strings (format: "HH:MM" or "HH:MM:SS")
    const parseTime = (timeStr: string) => {
        const parts = timeStr.split(":");
        return {
            hour: parseInt(parts[0], 10),
            minute: parseInt(parts[1], 10) || 0
        };
    };
    
    const startTimeParsed = parseTime(startTime);
    const endTimeParsed = parseTime(endTime);

    let currentTime = setMinutes(setHours(date, startTimeParsed.hour), startTimeParsed.minute);
    const dayEndTime = setMinutes(setHours(date, endTimeParsed.hour), endTimeParsed.minute);

    // Ocultar horários já passados (hoje: mínimo 15 min de antecedência para agendar)
    const now = new Date();
    const dateStrLocal = toDateInputValue(date);
    const isToday = dateStrLocal === getTodayDateString();
    const minTimeForToday = isToday ? addMinutes(now, 15) : null;

    while (currentTime < dayEndTime) {
        const slotEnd = addMinutes(currentTime, duration);

        // Check if slot fits within working hours
        if (slotEnd > dayEndTime) break;

        // Hoje: não mostrar slot que já começou ou começa em menos de 15 min
        if (isToday && minTimeForToday && currentTime < minTimeForToday) {
            currentTime = addMinutes(currentTime, duration);
            continue;
        }

        // Check if slot conflicts with existing appointments
        // Only consider appointments that are not cancelled (scheduled, confirmed, completed, no_show all block slots)
        const hasConflict = appointments?.some(apt => {
            // Skip cancelled appointments - they don't block slots
            if (apt.status === "cancelled") {
                return false;
            }
            
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
        .eq("date", dateStr)
        .single();

    if (exception && exception.all_day) {
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
        .single();

    if (!availability) {
        return {
            available: false,
            reason: "Profissional não atende neste dia da semana",
        };
    }

    // Use exception times if available and not all_day, otherwise use weekly availability
    const workStart = (exception && !exception.all_day && exception.start_time) 
        ? exception.start_time 
        : availability.start_time;
    const workEnd = (exception && !exception.all_day && exception.end_time) 
        ? exception.end_time 
        : availability.end_time;

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

    const dayStart = startOfLocalDay(date);
    const dayEnd = endOfLocalDay(date);

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
