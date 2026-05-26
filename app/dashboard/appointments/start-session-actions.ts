"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveMeetLink } from "@/lib/appointments/resolve-meet-link";

export async function startAppointmentSession(appointmentId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    const { data: appointment, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("professional_id", professional.id)
        .maybeSingle();

    if (error) {
        console.error("startAppointmentSession select:", error);
        throw new Error(
            error.message.includes("meet_link") || error.message.includes("meeting_link")
                ? "Banco desatualizado: execute a migração de automação no Supabase (meet_link)."
                : error.message
        );
    }

    if (!appointment) {
        throw new Error("Agendamento não encontrado");
    }

    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
        throw new Error("Não é possível iniciar esta sessão no status atual");
    }

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return {
        patientId: appointment.patient_id as string,
        meetLink: resolveMeetLink(appointment),
        status: appointment.status as string,
        appointmentType: appointment.type as string,
    };
}
