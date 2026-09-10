"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeCpfForDb, normalizePhoneForDb } from "@/lib/patients/format-for-db";
import { openText, sealText } from "@/lib/crypto/sensitive";

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

    return {
        ...patient,
        notes: openText(patient.notes),
    } as PatientData;
}

export async function createPatient(data: {
    fullName: string;
    dateOfBirth: string;
    phone: string;
    email?: string;
    cpf?: string | null;
    occupation?: string | null;
    notes?: string | null;
    avatarUrl?: string | null;
    whatsappOptIn?: boolean;
    address?: {
        zip?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    } | null;
}): Promise<{ id: string }> {
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

    const { data: patient, error } = await supabase
        .from("patients")
        .insert({
            professional_id: professional.id,
            full_name: data.fullName,
            cpf: data.cpf || null,
            date_of_birth: data.dateOfBirth,
            phone: data.phone,
            email: data.email || null,
            whatsapp_opt_in_at: data.whatsappOptIn ? new Date().toISOString() : null,
            occupation: data.occupation || null,
            notes: sealText(data.notes || null),
            avatar_url: data.avatarUrl || null,
            address: data.address ?? null,
        })
        .select("id")
        .single();

    if (error || !patient) {
        console.error("Error creating patient:", error);
        throw error ?? new Error("Failed to create patient");
    }

    revalidatePath("/dashboard/patients");
    return { id: patient.id };
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
    avatarUrl?: string;
    whatsappOptIn?: boolean;
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
        .select("professional_id, whatsapp_opt_in_at")
        .eq("id", data.patientId)
        .single();

    if (!existingPatient || existingPatient.professional_id !== professional.id) {
        throw new Error("Patient not found or access denied");
    }

    // Preserva a data original do consentimento enquanto ele continuar ativo
    const whatsappOptInAt = data.whatsappOptIn
        ? existingPatient.whatsapp_opt_in_at ?? new Date().toISOString()
        : null;

    const { error } = await supabase
        .from("patients")
        .update({
            full_name: data.fullName,
            whatsapp_opt_in_at: whatsappOptInAt,
            date_of_birth: data.dateOfBirth,
            phone: normalizePhoneForDb(data.phone),
            email: data.email || null,
            cpf: normalizeCpfForDb(data.cpf),
            occupation: data.occupation || null,
            notes: sealText(data.notes || null),
            avatar_url: data.avatarUrl || null,
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

export async function importPatients(
    rows: Array<{
        full_name: string;
        email?: string | null;
        phone: string;
        cpf?: string | null;
        date_of_birth: string;
        address?: Record<string, unknown>;
        notes?: string | null;
    }>
) {
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

    const patientsToInsert = rows.map((row) => ({
        ...row,
        professional_id: professional.id,
        notes: sealText(row.notes || "Importado via CSV"),
    }));

    const { error } = await supabase.from("patients").insert(patientsToInsert);
    if (error) {
        throw error;
    }

    revalidatePath("/dashboard/patients");
    return { count: patientsToInsert.length };
}

