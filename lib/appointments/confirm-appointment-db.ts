import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMeetLink, type MeetLinkSource } from "@/lib/appointments/resolve-meet-link";

type AdminClient = SupabaseClient;

/** Confirma agendamento no banco de forma compatível com meet_link ou meeting_link. */
export async function confirmAppointmentInDb(
    supabase: AdminClient,
    appointmentId: string,
    meetLink?: string | null,
    confirmedVia: "link" | "professional" = "link"
): Promise<{ id: string; status: string; professional_id: string }> {
    const { data: updated, error: statusError } = await supabase
        .from("appointments")
        .update({ status: "confirmed", confirmed_via: confirmedVia })
        .eq("id", appointmentId)
        .select("id, status, professional_id")
        .single();

    if (statusError || !updated) {
        console.error("confirmAppointmentInDb status:", statusError);
        throw new Error(statusError?.message || "Erro ao confirmar agendamento");
    }

    if (meetLink) {
        const { error: meetLinkError } = await supabase
            .from("appointments")
            .update({ meet_link: meetLink })
            .eq("id", appointmentId);

        if (meetLinkError) {
            const { error: legacyError } = await supabase
                .from("appointments")
                .update({ meeting_link: meetLink })
                .eq("id", appointmentId);

            if (legacyError) {
                console.warn("confirmAppointmentInDb meet link:", legacyError.message);
            }
        }
    }

    return updated;
}

export function pickMeetLinkFromRow(row: MeetLinkSource): string | null {    return resolveMeetLink(row);
}
