// Utility functions for working with professional availability

export interface AvailabilitySlot {
    day_of_week: number;
    start_time: string;
    end_time: string;
}

// Get work hours for a specific day
export function getWorkHoursForDay(
    availability: AvailabilitySlot[],
    date: Date
): { startHour: number; endHour: number } | null {
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

    if (!dayAvailability) {
        return null; // Professional doesn't work this day
    }

    // Parse start and end times (format: "HH:mm:ss")
    const startParts = dayAvailability.start_time.split(':');
    const endParts = dayAvailability.end_time.split(':');

    const startHour = parseInt(startParts[0]);
    const endHour = parseInt(endParts[0]);

    return { startHour, endHour };
}

// Generate hour labels for display (e.g., "09:00", "10:00", etc.)
export function generateHourLabels(startHour: number, endHour: number): string[] {
    const hours: string[] = [];

    for (let hour = startHour; hour <= endHour; hour++) {
        hours.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    return hours;
}

// Check if professional works on a given day
export function doesProfessionalWorkOnDay(
    availability: AvailabilitySlot[],
    date: Date
): boolean {
    const dayOfWeek = date.getDay();
    return availability.some(a => a.day_of_week === dayOfWeek);
}
