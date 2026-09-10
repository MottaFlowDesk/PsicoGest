"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
    openRecordContent,
    openRecordText,
    sealRecordContent,
} from "@/lib/crypto/sensitive";

export type MedicalRecord = {
    id: string;
    professional_id: string;
    patient_id: string;
    title: string;
    status: "draft" | "finalized";
    current_version: number;
    finalized_at: string | null;
    created_at: string;
    updated_at: string;
    versions?: MedicalRecordVersion[];
};

export type MedicalRecordVersion = {
    id: string;
    medical_record_id: string;
    version: number;
    content: any; // JSONB
    edited_by: string;
    edit_reason: string | null;
    created_at: string;
};

export async function getPatientRecords(patientId: string) {
    const supabase = await createClient();

    const { data: records, error } = await supabase
        .from("medical_records")
        .select(`
      *,
      versions:medical_record_versions(*)
    `)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching records:", error);
        throw new Error("Failed to fetch medical records");
    }

    const recordsWithSortedVersions = records.map((record) => ({
        ...record,
        versions: record.versions
            .sort((a: any, b: any) => b.version - a.version)
            .map((version: MedicalRecordVersion) => ({
                ...version,
                content: openRecordContent(version.content),
            })),
    }));

    return recordsWithSortedVersions as MedicalRecord[];
}

export async function createMedicalRecord(data: {
    patientId: string;
    title: string;
    content: string; // Will be stored as JSON
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Get professional ID
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional profile not found");
    }

    // 1. Create the parent record
    const { data: record, error: recordError } = await supabase
        .from("medical_records")
        .insert({
            professional_id: professional.id,
            patient_id: data.patientId,
            title: data.title,
            status: "draft",
            current_version: 1,
        })
        .select()
        .single();

    if (recordError) {
        console.error("Error creating record:", recordError);
        throw new Error("Failed to create medical record");
    }

    // 2. Create the first version
    const { error: versionError } = await supabase
        .from("medical_record_versions")
        .insert({
            medical_record_id: record.id,
            version: 1,
            content: sealRecordContent(data.content),
            edited_by: professional.id,
            edit_reason: "Initial creation",
        });

    if (versionError) {
        // Cleanup if version creation fails (optional but good practice)
        await supabase.from("medical_records").delete().eq("id", record.id);
        console.error("Error creating record version:", versionError);
        throw new Error("Failed to create medical record version");
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return record;
}

export async function updateMedicalRecord(data: {
    recordId: string;
    patientId: string;
    content: string;
    status?: "draft" | "finalized";
    editReason?: string;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Get professional ID
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional profile not found");
    }

    // 1. Fetch current record to get version
    const { data: currentRecord, error: fetchError } = await supabase
        .from("medical_records")
        .select("current_version, status")
        .eq("id", data.recordId)
        .single();

    if (fetchError || !currentRecord) {
        throw new Error("Record not found");
    }

    if (currentRecord.status === "finalized") {
        throw new Error("Cannot edit a finalized record");
    }

    const newVersion = currentRecord.current_version + 1;

    // 2. Create new version
    const { error: versionError } = await supabase
        .from("medical_record_versions")
        .insert({
            medical_record_id: data.recordId,
            version: newVersion,
            content: sealRecordContent(data.content),
            edited_by: professional.id,
            edit_reason: data.editReason || "Update",
        });

    if (versionError) {
        console.error("Error creating new version:", versionError);
        throw new Error("Failed to update record");
    }

    // 3. Update parent record metadata
    const updateData: any = {
        current_version: newVersion,
        updated_at: new Date().toISOString(),
    };

    if (data.status === "finalized") {
        updateData.status = "finalized";
        updateData.finalized_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
        .from("medical_records")
        .update(updateData)
        .eq("id", data.recordId);

    if (updateError) {
        console.error("Error updating record metadata:", updateError);
        throw new Error("Failed to update record metadata");
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return { success: true };
}

async function requireProfessional() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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

    return { supabase, professional };
}

export type PatientSession = {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    type: string;
    status: string;
    medical_records: {
        id: string;
        title: string;
        updated_at: string;
        content: string;
    }[];
};

export async function getPatientSessions(patientId: string): Promise<PatientSession[]> {
    const { supabase, professional } = await requireProfessional();

    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id, scheduled_at, duration_minutes, type, status,
            medical_records (
                id, title, updated_at,
                medical_record_versions (
                    content, version
                )
            )
        `)
        .eq("patient_id", patientId)
        .eq("professional_id", professional.id)
        .order("scheduled_at", { ascending: false });

    if (error) {
        console.error("Error fetching sessions:", error);
        throw new Error("Failed to fetch sessions");
    }

    return (data ?? []).map((appointment: any) => {
        const records = (appointment.medical_records ?? []).map((record: any) => {
            const versions = [...(record.medical_record_versions ?? [])].sort(
                (a: any, b: any) => b.version - a.version
            );
            return {
                id: record.id,
                title: record.title,
                updated_at: record.updated_at,
                content: openRecordText(versions[0]?.content),
            };
        });

        return {
            id: appointment.id,
            scheduled_at: appointment.scheduled_at,
            duration_minutes: appointment.duration_minutes,
            type: appointment.type,
            status: appointment.status,
            medical_records: records,
        };
    });
}

export async function saveAppointmentEvolution(data: {
    appointmentId: string;
    patientId: string;
    title?: string;
    content: string;
    recordId?: string;
}) {
    const { supabase, professional } = await requireProfessional();
    const title = data.title?.trim() || "Evolução da Sessão";

    let recordId = data.recordId;

    if (!recordId) {
        const { data: existing } = await supabase
            .from("medical_records")
            .select("id, current_version")
            .eq("appointment_id", data.appointmentId)
            .eq("professional_id", professional.id)
            .maybeSingle();

        if (existing) {
            recordId = existing.id;
        } else {
            const { data: created, error: createError } = await supabase
                .from("medical_records")
                .insert({
                    professional_id: professional.id,
                    patient_id: data.patientId,
                    appointment_id: data.appointmentId,
                    title,
                    status: "draft",
                    current_version: 0,
                })
                .select("id")
                .single();

            if (createError || !created) {
                console.error("Error creating session record:", createError);
                throw new Error("Failed to create medical record");
            }
            recordId = created.id;
        }
    }

    const { data: current } = await supabase
        .from("medical_records")
        .select("id, current_version, status, professional_id")
        .eq("id", recordId)
        .single();

    if (!current || current.professional_id !== professional.id) {
        throw new Error("Record not found or access denied");
    }

    if (current.status === "finalized") {
        throw new Error("Cannot edit a finalized record");
    }

    const nextVersion = (current.current_version || 0) + 1;

    const { error: versionError } = await supabase
        .from("medical_record_versions")
        .insert({
            medical_record_id: recordId,
            version: nextVersion,
            content: sealRecordContent(data.content),
            edited_by: professional.id,
            edit_reason: "Evolução da sessão",
        });

    if (versionError) {
        console.error("Error saving session evolution:", versionError);
        throw new Error("Failed to save medical record version");
    }

    const { error: updateError } = await supabase
        .from("medical_records")
        .update({
            current_version: nextVersion,
            updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

    if (updateError) {
        throw new Error("Failed to update record metadata");
    }

    revalidatePath(`/dashboard/patients/${data.patientId}`);
    return { success: true, recordId };
}
