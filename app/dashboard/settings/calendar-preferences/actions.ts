"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const agendaSettingsSchema = z.object({
    defaultSessionDuration: z.coerce.number().min(15, "Mínimo 15 minutos"),
    defaultSessionInterval: z.coerce.number().min(0, "Mínimo 0 minutos"),
});

export type AgendaSettingsData = z.infer<typeof agendaSettingsSchema>;

export async function updateAgendaSettings(data: AgendaSettingsData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("settings")
        .upsert({
            user_id: user.id,
            default_session_duration: data.defaultSessionDuration,
            default_session_interval: data.defaultSessionInterval,
        }, { onConflict: 'user_id' });

    if (error) {
        console.error("Error updating agenda settings:", error);
        throw new Error("Failed to update agenda settings");
    }

    revalidatePath("/dashboard/settings/calendar-preferences");
    return { success: true };
}

export async function getAgendaSettings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data } = await supabase
        .from("settings")
        .select("default_session_duration, default_session_interval")
        .eq("user_id", user.id)
        .single();

    return data;
}
