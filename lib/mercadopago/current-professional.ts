import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfessionalId(): Promise<
    { userId: string; professionalId: string } | { error: "unauthorized" | "not_found" }
> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "unauthorized" };
    }

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!professional?.id) {
        return { error: "not_found" };
    }

    return { userId: user.id, professionalId: professional.id };
}
