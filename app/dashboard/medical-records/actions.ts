"use server";

import { createClient } from "@/lib/supabase/server";
import { subDays, subMonths } from "date-fns";

export type MedicalRecordWithPatient = {
    id: string;
    professional_id: string;
    patient_id: string;
    title: string;
    status: "draft" | "finalized";
    current_version: number;
    finalized_at: string | null;
    created_at: string;
    updated_at: string;
    patient: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
    latest_version?: {
        id: string;
        version: number;
        content: any;
        created_at: string;
    };
};

export type RecordFilters = {
    status?: "all" | "draft" | "finalized";
    period?: "all" | "7days" | "30days" | "3months";
    search?: string;
};

export async function getAllMedicalRecords(
    filters?: RecordFilters
): Promise<MedicalRecordWithPatient[]> {
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

    // Build query
    let query = supabase
        .from("medical_records")
        .select(`
            *,
            patient:patients!patient_id (
                id,
                full_name,
                avatar_url
            ),
            latest_version:medical_record_versions (
                id,
                version,
                content,
                created_at
            )
        `)
        .eq("professional_id", professional.id)
        .order("updated_at", { ascending: false });

    // Apply status filter
    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    // Apply period filter
    if (filters?.period && filters.period !== "all") {
        let startDate: Date;
        const now = new Date();

        switch (filters.period) {
            case "7days":
                startDate = subDays(now, 7);
                break;
            case "30days":
                startDate = subDays(now, 30);
                break;
            case "3months":
                startDate = subMonths(now, 3);
                break;
            default:
                startDate = new Date(0); // Beginning of time
        }

        query = query.gte("updated_at", startDate.toISOString());
    }

    const { data: records, error } = await query;

    if (error) {
        console.error("Error fetching medical records:", error);
        throw new Error("Failed to fetch medical records");
    }

    // Process records to get only the latest version
    const processedRecords = records.map((record: any) => {
        const versions = record.latest_version || [];
        const latestVersion = versions.sort(
            (a: any, b: any) => b.version - a.version
        )[0];

        return {
            ...record,
            patient: record.patient,
            latest_version: latestVersion || null,
        };
    });

    // Apply search filter (client-side for simplicity)
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return processedRecords.filter(
            (record: MedicalRecordWithPatient) =>
                record.title.toLowerCase().includes(searchLower) ||
                record.patient?.full_name?.toLowerCase().includes(searchLower)
        );
    }

    return processedRecords as MedicalRecordWithPatient[];
}

export async function getMedicalRecordsStats() {
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

    const { data: records, error } = await supabase
        .from("medical_records")
        .select("id, status")
        .eq("professional_id", professional.id);

    if (error) {
        console.error("Error fetching stats:", error);
        return { total: 0, drafts: 0, finalized: 0 };
    }

    const total = records.length;
    const drafts = records.filter((r) => r.status === "draft").length;
    const finalized = records.filter((r) => r.status === "finalized").length;

    return { total, drafts, finalized };
}

