import { Event } from "@/types";
import { getVariantByStatus } from "@/lib/calendar-data";

/** Atualiza cor/estado do card no calendário conforme status do agendamento */
export function patchEventWithAppointmentStatus(event: Event, status: string): Event {
    return {
        ...event,
        variant: getVariantByStatus(status) as Event["variant"],
        metadata: {
            ...event.metadata,
            status,
        },
    };
}
