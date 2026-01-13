"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { revalidatePath } from "next/cache";

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
    description?: string | null;
    patient: {
        full_name: string;
    };
    patient_id?: string;
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
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error("Não autorizado. Faça login novamente.");
        }

        // Get professional
        const { data: professional, error: profError } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (profError || !professional) {
            throw new Error("Perfil profissional não encontrado. Complete o onboarding primeiro.");
        }

        // Validate amount
        if (!data.amount || data.amount <= 0) {
            throw new Error("Valor da fatura deve ser maior que zero.");
        }

        // Validate due date
        if (!data.dueDate) {
            throw new Error("Data de vencimento é obrigatória.");
        }

        // Ensure due_date is not before issue_date
        const issueDate = new Date().toISOString().split('T')[0]; // Today's date
        const dueDate = data.dueDate;
        
        if (dueDate < issueDate) {
            throw new Error("Data de vencimento não pode ser anterior à data de emissão.");
        }

        // Validate patient exists
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("id")
            .eq("id", data.patientId)
            .single();

        if (patientError || !patient) {
            throw new Error("Paciente não encontrado.");
        }

        // Insert invoice
        const { data: invoice, error: insertError } = await supabase
            .from("invoices")
            .insert({
                professional_id: professional.id,
                patient_id: data.patientId,
                amount_cents: Math.round(data.amount * 100),
                due_date: dueDate,
                issue_date: issueDate, // Explicitly set issue_date
                description: data.description || "Consulta Avulsa",
                status: "pending",
                fiscal_year: new Date().getFullYear(),
                sequence_number: 999999, // Dummy, trigger should overwrite
                invoice_number: null // Trigger target
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error inserting invoice:", insertError);
            
            // Provide more specific error messages
            if (insertError.code === '23505') { // Unique constraint violation
                throw new Error("Erro ao gerar número da fatura. Tente novamente.");
            } else if (insertError.code === '23503') { // Foreign key violation
                throw new Error("Paciente ou profissional inválido.");
            } else if (insertError.code === '23514') { // Check constraint violation
                throw new Error("Data de vencimento inválida. Verifique a data selecionada.");
            } else {
                throw new Error(`Erro ao criar fatura: ${insertError.message}`);
            }
        }

        if (!invoice) {
            throw new Error("Fatura criada mas não foi retornada. Verifique se foi criada corretamente.");
        }
        
        revalidatePath("/dashboard/financial");
        revalidatePath("/dashboard");
        
        return { success: true, invoiceId: invoice.id };
    } catch (error: any) {
        console.error("createManualInvoice error:", error);
        // Re-throw with a user-friendly message
        if (error.message) {
            throw error;
        }
        throw new Error("Erro ao criar fatura. Tente novamente.");
    }
}

export async function markInvoiceAsPaid(invoiceId: string, paymentMethod?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Verify ownership
    const { data: invoice } = await supabase
        .from("invoices")
        .select("professional_id, status")
        .eq("id", invoiceId)
        .single();

    if (!invoice || invoice.professional_id !== professional.id) {
        throw new Error("Invoice not found or access denied");
    }

    if (invoice.status === "paid") {
        throw new Error("Invoice is already paid");
    }

    if (invoice.status === "cancelled") {
        throw new Error("Cannot mark a cancelled invoice as paid");
    }

           const { error } = await supabase
               .from("invoices")
               .update({
                   status: "paid",
                   paid_at: new Date().toISOString(),
                   payment_method: paymentMethod || "other",
               })
               .eq("id", invoiceId);

           if (error) throw error;

           // Create notification for payment received
           try {
               const { notifyPaymentReceived } = await import("@/lib/notifications/payment-notifications");
               const { data: invoiceData } = await supabase
                   .from("invoices")
                   .select("invoice_number, amount_cents")
                   .eq("id", invoiceId)
                   .single();

               if (invoiceData) {
                   await notifyPaymentReceived(professional.id, {
                       invoiceNumber: invoiceData.invoice_number,
                       amount: invoiceData.amount_cents / 100,
                       invoiceId: invoiceId,
                   });
               }
           } catch (notificationError) {
               console.error("Failed to create payment notification:", notificationError);
           }

           revalidatePath("/dashboard/financial");
           revalidatePath("/dashboard");

           return { success: true };
       }

export async function cancelInvoice(invoiceId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Verify ownership
    const { data: invoice } = await supabase
        .from("invoices")
        .select("professional_id, status")
        .eq("id", invoiceId)
        .single();

    if (!invoice || invoice.professional_id !== professional.id) {
        throw new Error("Invoice not found or access denied");
    }

    if (invoice.status === "paid") {
        throw new Error("Cannot cancel a paid invoice");
    }

    if (invoice.status === "cancelled") {
        throw new Error("Invoice is already cancelled");
    }

    const { error } = await supabase
        .from("invoices")
        .update({
            status: "cancelled",
            notes: reason ? `Cancelado: ${reason}` : "Cancelado",
        })
        .eq("id", invoiceId);

    if (error) throw error;

    revalidatePath("/dashboard/financial");
    revalidatePath("/dashboard");

    return { success: true };
}

export async function updateInvoice(data: {
    invoiceId: string;
    amount?: number;
    dueDate?: string;
    description?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) throw new Error("Professional not found");

    // Verify ownership
    const { data: invoice } = await supabase
        .from("invoices")
        .select("professional_id, status")
        .eq("id", data.invoiceId)
        .single();

    if (!invoice || invoice.professional_id !== professional.id) {
        throw new Error("Invoice not found or access denied");
    }

    if (invoice.status !== "pending") {
        throw new Error("Can only edit pending invoices");
    }

    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount_cents = Math.round(data.amount * 100);
    if (data.dueDate) updateData.due_date = data.dueDate;
    if (data.description !== undefined) updateData.description = data.description;

    const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", data.invoiceId);

    if (error) throw error;

    revalidatePath("/dashboard/financial");
    revalidatePath("/dashboard");

    return { success: true };
}
