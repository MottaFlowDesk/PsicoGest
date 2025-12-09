import { createClient } from "@/lib/supabase/client";
import { Event } from "@/types";
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parse, addMinutes } from "date-fns";

// Fetch professional availability (weekly schedule)
export async function fetchProfessionalAvailability(professionalId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId)
        .order("day_of_week", { ascending: true });

    if (error) {
        console.error("Error fetching availability:", error);
        return [];
    }

    return data || [];
}

// Fetch availability overrides (vacations, holidays, blocks)
export async function fetchAvailabilityOverrides(
    professionalId: string,
    startDate: Date,
    endDate: Date
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("professional_id", professionalId)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"));

    if (error) {
        console.error("Error fetching overrides:", error);
        return [];
    }

    return data || [];
}

// Fetch appointments with patient information
export async function fetchAppointments(
    professionalId: string,
    startDate: Date,
    endDate: Date
) {
    const supabase = createClient();

    // First, try to fetch appointments without the join
    const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("professional_id", professionalId)
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString())
        .order("scheduled_at", { ascending: true });

    if (error) {
        console.error("Error fetching appointments:", JSON.stringify(error, null, 2));
        return [];
    }

    if (!data || data.length === 0) {
        return [];
    }

    // Fetch patient names separately
    const patientIds = [...new Set(data.map(a => a.patient_id).filter(Boolean))];

    if (patientIds.length === 0) {
        return data;
    }

    const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("id, full_name")
        .in("id", patientIds);

    if (patientsError) {
        console.error("Error fetching patients:", JSON.stringify(patientsError, null, 2));
        // Return appointments without patient names
        return data;
    }

    // Map patient names to appointments
    const patientsMap = new Map(patients?.map(p => [p.id, p]) || []);

    return data.map(appointment => ({
        ...appointment,
        patients: patientsMap.get(appointment.patient_id)
    }));
}

// Get variant (color) based on appointment status
function getVariantByStatus(status: string): string {
    switch (status) {
        case "confirmed":
            return "green";
        case "cancelled":
            return "red";
        case "in_progress":
            return "purple";
        case "scheduled":
        default:
            return "blue";
    }
}

// Transform appointments to Event format
export function transformAppointmentsToEvents(appointments: any[]): Event[] {
    return appointments.map((appointment) => {
        const startDate = new Date(appointment.scheduled_at);
        const endDate = addMinutes(startDate, appointment.duration_minutes);

        return {
            id: appointment.id,
            title: appointment.patients?.full_name || "Paciente",
            description: `Duração: ${appointment.duration_minutes} min`,
            startDate,
            endDate,
            variant: getVariantByStatus(appointment.status) as any,
            metadata: {
                type: "appointment",
                patientId: appointment.patient_id,
                status: appointment.status,
                appointmentType: appointment.type,
            },
        };
    });
}

// Transform overrides to Event format (vacation/holiday blocks)
export function transformOverridesToEvents(overrides: any[]): Event[] {
    return overrides.map((override) => {
        const baseDate = new Date(override.date);

        let startDate: Date;
        let endDate: Date;

        if (override.all_day) {
            // All-day block
            startDate = new Date(baseDate.setHours(0, 0, 0, 0));
            endDate = new Date(baseDate.setHours(23, 59, 59, 999));
        } else {
            // Partial day block
            const startTime = parse(override.start_time, "HH:mm:ss", baseDate);
            const endTime = parse(override.end_time, "HH:mm:ss", baseDate);
            startDate = startTime;
            endDate = endTime;
        }

        const title = override.reason === "vacation" ? "Férias" :
            override.reason === "holiday" ? "Feriado" : "Bloqueio";

        return {
            id: override.id,
            title,
            description: override.notes || "",
            startDate,
            endDate,
            variant: "red-striped" as any,
            metadata: {
                type: "override",
                reason: override.reason,
                allDay: override.all_day,
            },
        };
    });
}

// Generate unavailable time slots based on availability
export function generateUnavailableSlots(
    availability: any[],
    startDate: Date,
    endDate: Date,
    overrides: any[]
): Event[] {
    const unavailableEvents: Event[] = [];

    // For each day in the range
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();

        // Find availability for this day
        const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

        if (dayAvailability) {
            // Professional works this day
            // Create unavailable blocks for times outside working hours

            const workStart = parse(dayAvailability.start_time, "HH:mm:ss", currentDate);
            const workEnd = parse(dayAvailability.end_time, "HH:mm:ss", currentDate);

            // Block before work starts (00:00 to work start)
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);

            if (dayStart < workStart) {
                unavailableEvents.push({
                    id: `unavailable-before-${format(currentDate, "yyyy-MM-dd")}`,
                    title: "Indisponível",
                    description: "",
                    startDate: dayStart,
                    endDate: workStart,
                    variant: "gray" as any,
                    metadata: { type: "unavailable" },
                });
            }

            // Block after work ends (work end to 23:59)
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            if (workEnd < dayEnd) {
                unavailableEvents.push({
                    id: `unavailable-after-${format(currentDate, "yyyy-MM-dd")}`,
                    title: "Indisponível",
                    description: "",
                    startDate: workEnd,
                    endDate: dayEnd,
                    variant: "gray" as any,
                    metadata: { type: "unavailable" },
                });
            }
        } else {
            // Professional doesn't work this day - entire day unavailable
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            unavailableEvents.push({
                id: `unavailable-full-${format(currentDate, "yyyy-MM-dd")}`,
                title: "Indisponível",
                description: "",
                startDate: dayStart,
                endDate: dayEnd,
                variant: "gray" as any,
                metadata: { type: "unavailable" },
            });
        }

        currentDate = addDays(currentDate, 1);
    }

    return unavailableEvents;
}

// Main function to fetch all calendar data
export async function fetchAllCalendarData(
    professionalId: string,
    viewDate: Date,
    viewType: "day" | "week" | "month"
) {
    // Determine date range based on view type
    let startDate: Date;
    let endDate: Date;

    switch (viewType) {
        case "day":
            startDate = new Date(viewDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(viewDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        case "week":
            startDate = startOfWeek(viewDate, { weekStartsOn: 1 }); // Monday
            endDate = endOfWeek(viewDate, { weekStartsOn: 1 });
            break;
        case "month":
            startDate = startOfMonth(viewDate);
            endDate = endOfMonth(viewDate);
            break;
    }

    // Fetch all data in parallel
    const [availability, overrides, appointments] = await Promise.all([
        fetchProfessionalAvailability(professionalId),
        fetchAvailabilityOverrides(professionalId, startDate, endDate),
        fetchAppointments(professionalId, startDate, endDate),
    ]);

    // Transform to events
    const appointmentEvents = transformAppointmentsToEvents(appointments);
    const overrideEvents = transformOverridesToEvents(overrides);

    // Don't generate unavailable slots - the calendar views will handle showing only available hours
    // based on the availability data

    // Combine all events
    const allEvents = [...appointmentEvents, ...overrideEvents];

    return allEvents;
}
