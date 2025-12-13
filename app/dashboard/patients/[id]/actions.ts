"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PatientData = {
    id: string;
    professional_id: string;
    full_name: string;
    date_of_birth: string;
    phone: string;
    email: string | null;
    cpf: string | null;
    occupation: string | null;
    notes: string | null;
    address: {
        zip?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    } | null;
    archived: boolean;
    created_at: string;
    updated_at: string;
};

export async function getPatient(patientId: string): Promise<PatientData | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: patient, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

    if (error) {
        console.error("Error fetching patient:", error);
        return null;
    }

    return patient as PatientData;
}

export async function updatePatient(data: {
    patientId: string;
    fullName: string;
    dateOfBirth: string;
    phone: string;
    email?: string;
    cpf?: string;
    occupation?: string;
    notes?: string;
    address?: {
        cep?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    };
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Verify the patient belongs to this professional
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional profile not found");
    }

    const { data: existingPatient } = await supabase
        .from("patients")
        .select("professional_id")
        .eq("id", data.patientId)
        .single();

    if (!existingPatient || existingPatient.professional_id !== professional.id) {
        throw new Error("Patient not found or access denied");
    }

    const { error } = await supabase
        .from("patients")
        .update({
            full_name: data.fullName,
            date_of_birth: data.dateOfBirth,
            phone: data.phone,
            email: data.email || null,
            cpf: data.cpf || null,
            occupation: data.occupation || null,
            notes: data.notes || null,
            address: data.address ? {
                zip: data.address.cep,
                street: data.address.street,
                number: data.address.number,
                complement: data.address.complement,
                neighborhood: data.address.neighborhood,
                city: data.address.city,
                state: data.address.state,
            } : null,
        })
        .eq("id", data.patientId);

    if (error) {
        console.error("Error updating patient:", error);
        throw new Error("Failed to update patient");
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    revalidatePath("/dashboard/patients");
    return { success: true };
}

export async function archivePatient(patientId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional profile not found");
    }

    const { error } = await supabase
        .from("patients")
        .update({
            archived: true,
            archived_reason: reason || null,
            archived_at: new Date().toISOString(),
        })
        .eq("id", patientId)
        .eq("professional_id", professional.id);

    if (error) {
        console.error("Error archiving patient:", error);
        throw new Error("Failed to archive patient");
    }

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/patients");
    return { success: true };
}

export async function unarchivePatient(patientId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional profile not found");
    }

    const { error } = await supabase
        .from("patients")
        .update({
            archived: false,
            archived_reason: null,
            archived_at: null,
        })
        .eq("id", patientId)
        .eq("professional_id", professional.id);

    if (error) {
        console.error("Error unarchiving patient:", error);
        throw new Error("Failed to unarchive patient");
    }

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/patients");
    return { success: true };
}

