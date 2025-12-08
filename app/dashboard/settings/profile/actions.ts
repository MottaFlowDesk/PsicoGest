"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    bio: z.string().optional(),
    phone: z.string().optional(),
    specialty: z.string().optional(), // Will be stored as comma separated or single string for now
    registrationNumber: z.string().optional(),
    addressZip: z.string().optional(),
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    addressNeighborhood: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    avatarUrl: z.string().optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;

export async function updateProfile(data: ProfileData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("professionals")
        .update({
            full_name: data.fullName,
            bio: data.bio,
            phone: data.phone,
            specialty: data.specialty,
            registration_number: data.registrationNumber,
            address_zip: data.addressZip,
            address_street: data.addressStreet,
            address_number: data.addressNumber,
            address_complement: data.addressComplement,
            address_neighborhood: data.addressNeighborhood,
            address_city: data.addressCity,
            address_state: data.addressState,
            avatar_url: data.avatarUrl,
        })
        .eq("user_id", user.id);

    if (error) {
        console.error("Error updating profile:", error);
        throw new Error("Failed to update profile");
    }

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/dashboard/profile"); // If we have a public profile preview later
    return { success: true };
}

export async function getProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data } = await supabase
        .from("professionals")
        .select("*")
        .eq("user_id", user.id)
        .single();

    return data;
}
