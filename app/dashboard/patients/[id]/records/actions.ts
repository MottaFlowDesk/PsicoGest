"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

    // Sort versions for each record by version number desc
    const recordsWithSortedVersions = records.map((record) => ({
        ...record,
        versions: record.versions.sort((a: any, b: any) => b.version - a.version),
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
            content: { text: data.content }, // Storing as JSON object
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
            content: { text: data.content },
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
