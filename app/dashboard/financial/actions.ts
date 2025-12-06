"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface DashboardSummary {
    revenue: number; // Total received (paid)
    pending: number; // Pending amount
    overdue: number; // Overdue amount (and count)
    overdueCount: number;
}

export type Invoice = {
    id: string;
    invoice_number: string;
    amount_cents: number;
    status: "pending" | "paid" | "overdue" | "cancelled";
    due_date: string;
    issue_date: string;
    paid_at: string | null;
    patient: {
        full_name: string;
    };
};

export async function getFinancialSummary(): Promise<DashboardSummary> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { revenue: 0, pending: 0, overdue: 0, overdueCount: 0 };

    // Current month range for REVENUE (Received in this month)
    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();

    // 1. Revenue: Payments received this month (status = 'paid' or invoices paid_at in range)
    // For simplicity, we'll check invoices table 'paid_at'
    const { data: paidInvoices, error: paidError } = await supabase
        .from("invoices")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", start)
        .lte("paid_at", end);

    const revenue =
        paidInvoices?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;

    // 2. Pending: Status = 'pending' (All time or just future? Usually all open invoices)
    const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("amount_cents")
        .eq("status", "pending");

    const pending =
        pendingInvoices?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;

    // 3. Overdue: Status = 'overdue' OR (status = 'pending' AND due_date < today)
    // Note: If we don't have a background job updating status to 'overdue', we must check date manually.
    const todayStr = format(now, "yyyy-MM-dd");

    const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("amount_cents")
        .eq("status", "pending") // Assuming system doesn't auto-update to 'overdue' yet
        .lt("due_date", todayStr);

    const overdue =
        overdueInvoices?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;
    const overdueCount = overdueInvoices?.length || 0;

    return {
        revenue: revenue / 100, // Convert cents to real unit
        pending: pending / 100,
        overdue: overdue / 100,
        overdueCount,
    };
}

export async function getInvoices(patientId?: string) {
    const supabase = await createClient();

    let query = supabase
        .from("invoices")
        .select(`
      id,
      invoice_number,
      amount_cents,
      status,
      due_date,
      issue_date,
      paid_at,
      patient:patients ( full_name )
    `)
        .order("due_date", { ascending: false })
        .limit(20);

    if (patientId) {
        query = query.eq("patient_id", patientId);
    }

    const { data: invoices, error } = await query;

    if (error) {
        console.error("Error fetching invoices:", error);
        return [];
    }

    // Sanitize and check for overdue manually if needed (display logic)
    return invoices as unknown as Invoice[];
}

export async function createManualInvoice(data: {
    patientId: string;
    amount: number; // in Reais
    dueDate: string;
    description: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    const { error } = await supabase.from("invoices").insert({
        professional_id: professional?.id,
        patient_id: data.patientId,
        amount_cents: Math.round(data.amount * 100),
        due_date: data.dueDate,
        description: data.description,
        status: "pending",
        fiscal_year: new Date().getFullYear(),
        sequence_number: null, // Let trigger generate (hack from previous file if it was 9999) or null if trigger handles
        // Actually, trigger handles null invoice_number, but sequence_number is NOT NULL in schema usually. 
        // Looking at schema: sequence_number INTEGER NOT NULL.
        // The trigger provided earlier: 
        // BEFORE INSERT ... generates sequence_number and invoice_number.
        // However, Trigger logic: NEW.sequence_number := next_seq;
        // So we can pass any dummy value for sequence_number if strict, or rely on trigger modifying it BEFORE null check.
        // The trigger is BEFORE INSERT. It sets values. IF DB constraint checks afterwards, it's fine.
        // But safely:
        sequence_number: 999999, // Dummy, trigger should overwrite
        invoice_number: null // Trigger target
    });

    if (error) throw error;
    return { success: true };
}
