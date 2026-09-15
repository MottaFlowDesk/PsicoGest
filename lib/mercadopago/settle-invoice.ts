import { getPublicPayInvoice } from "@/lib/invoices/public-pay";
import { getSellerConnectionForInvoice } from "@/lib/mercadopago/seller-access";
import { getMercadoPagoPayment } from "@/lib/mercadopago/preferences";
import { createAdminClient } from "@/lib/supabase/admin";

function invoicePaymentMethod(methodId?: string): "pix" | "credit_card" | "boleto" | "other" {
    if (methodId === "pix") return "pix";
    if (methodId === "bolbradesco" || methodId === "ticket" || methodId === "pec") return "boleto";
    if (methodId === "credit_card" || methodId === "debit_card") return "credit_card";
    return "other";
}

export async function applyApprovedMercadoPagoPayment(options: {
    invoiceId: string;
    paymentId: string;
    accessToken?: string;
}) {
    const invoice = await getPublicPayInvoice(options.invoiceId);
    if (!invoice) {
        throw new Error("Fatura não encontrada");
    }

    if (invoice.status === "paid") {
        return { alreadyPaid: true as const, status: "approved" };
    }

    const accessToken =
        options.accessToken ??
        (await getSellerConnectionForInvoice(invoice.professional_id))?.accessToken ??
        process.env.MP_ACCESS_TOKEN?.trim();

    if (!accessToken) {
        throw new Error("Conta Mercado Pago do profissional indisponível");
    }

    const payment = await getMercadoPagoPayment(accessToken, options.paymentId);
    if (payment.external_reference && payment.external_reference !== invoice.id) {
        throw new Error("Pagamento não corresponde a esta fatura");
    }

    if (payment.status !== "approved") {
        return { alreadyPaid: false as const, status: payment.status ?? "pending" };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("invoices")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: invoicePaymentMethod(payment.payment_method_id),
            mp_payment_id: String(payment.id),
        })
        .eq("id", invoice.id)
        .in("status", ["pending", "overdue"]);

    if (error) {
        throw new Error(error.message);
    }

    return { alreadyPaid: false as const, status: "approved" as const };
}
