import { createClient } from "@/lib/supabase/server";

export type PublicPayInvoice = {
    id: string;
    invoice_number: string;
    amount_cents: number;
    status: string;
    due_date: string;
    description: string | null;
    professional_name: string;
    patient_name: string;
    professional_id: string;
    mp_preference_id: string | null;
    mp_checkout_url: string | null;
};

export async function getPublicPayInvoice(
    invoiceId: string
): Promise<PublicPayInvoice | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_pay_invoice", {
        p_invoice_id: invoiceId,
    });

    if (error) {
        throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
}
