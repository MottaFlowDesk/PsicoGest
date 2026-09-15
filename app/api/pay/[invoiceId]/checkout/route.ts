import { NextRequest, NextResponse } from "next/server";
import { getPublicPayInvoice } from "@/lib/invoices/public-pay";
import { getSellerConnectionForInvoice } from "@/lib/mercadopago/seller-access";
import { createInvoiceCheckoutPreference } from "@/lib/mercadopago/preferences";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
    params: Promise<{ invoiceId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
    try {
        const { invoiceId } = await context.params;
        const invoice = await getPublicPayInvoice(invoiceId);

        if (!invoice) {
            return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
        }

        if (invoice.status === "paid") {
            return NextResponse.json({ error: "Esta fatura já foi paga" }, { status: 409 });
        }

        if (invoice.status === "cancelled") {
            return NextResponse.json({ error: "Esta fatura foi cancelada" }, { status: 409 });
        }

        const connection = await getSellerConnectionForInvoice(invoice.professional_id);
        if (!connection) {
            if (invoice.mp_checkout_url) {
                return NextResponse.json({ url: invoice.mp_checkout_url });
            }
            return NextResponse.json(
                {
                    error: "O profissional ainda não conectou o Mercado Pago para receber este pagamento.",
                },
                { status: 409 }
            );
        }

        const preference = await createInvoiceCheckoutPreference(connection.accessToken, {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            description: invoice.description,
            amountCents: invoice.amount_cents,
        });

        const supabase = await createClient();
        const { error } = await supabase.rpc("save_invoice_mp_preference", {
            p_invoice_id: invoice.id,
            p_preference_id: preference.preferenceId,
            p_checkout_url: preference.checkoutUrl,
        });

        if (error) {
            console.error("Failed to store Mercado Pago preference:", error);
        }

        return NextResponse.json({ url: preference.checkoutUrl });
    } catch (error) {
        console.error("Mercado Pago checkout error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Não foi possível abrir o checkout" },
            { status: 500 }
        );
    }
}
