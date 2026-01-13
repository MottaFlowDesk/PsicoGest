import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Criar checkout session para pagamento de fatura
 * POST /api/stripe/invoice-checkout
 * Body: { invoiceId: string }
 * 
 * Cria um checkout session no Stripe para pagar uma fatura específica.
 * Se o profissional tiver conta Stripe Connect, usa direct charge.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const { invoiceId } = await request.json();

        if (!invoiceId) {
            return NextResponse.json(
                { error: "invoiceId é obrigatório" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get invoice with professional's Stripe account
        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select(`
                *,
                professionals:professional_id (
                    id,
                    stripe_account_id,
                    stripe_connected_at
                )
            `)
            .eq("id", invoiceId)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json(
                { error: "Fatura não encontrada" },
                { status: 404 }
            );
        }

        // Check if invoice is already paid
        if (invoice.status === "paid") {
            return NextResponse.json(
                { error: "Esta fatura já foi paga" },
                { status: 400 }
            );
        }

        // Check if invoice is cancelled
        if (invoice.status === "cancelled") {
            return NextResponse.json(
                { error: "Esta fatura foi cancelada" },
                { status: 400 }
            );
        }

        const professional = invoice.professionals;

        // OBRIGATÓRIO: Profissional deve ter conta Stripe Connect ativa para receber pagamentos
        if (!professional?.stripe_account_id) {
            return NextResponse.json(
                { 
                    error: "Pagamento online não disponível. O profissional precisa conectar sua conta Stripe para receber pagamentos online. Entre em contato com o profissional para outras formas de pagamento." 
                },
                { status: 400 }
            );
        }

        // Verify account is active
        let account;
        try {
            account = await stripe.accounts.retrieve(professional.stripe_account_id);
        } catch (accountError: any) {
            console.error("Error retrieving Stripe account:", accountError);
            return NextResponse.json(
                { error: "Erro ao verificar conta Stripe do profissional" },
                { status: 500 }
            );
        }

        if (!account.charges_enabled || !account.payouts_enabled) {
            return NextResponse.json(
                { 
                    error: "Conta Stripe do profissional não está ativa. O profissional precisa completar o onboarding do Stripe Connect para receber pagamentos online. Entre em contato com o profissional para outras formas de pagamento." 
                },
                { status: 400 }
            );
        }

        // Create checkout session with connected account (direct charge)
        // Calculate application fee (2.9% + R$ 0,30)
        const applicationFeeAmount = Math.round(
            (invoice.amount_cents * 0.029) + 30
        );

        // Create checkout session with direct charge to connected account
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: `Fatura ${invoice.invoice_number}`,
                            description: invoice.description || "Pagamento de fatura",
                        },
                        unit_amount: invoice.amount_cents,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                on_behalf_of: professional.stripe_account_id,
                transfer_data: {
                    destination: professional.stripe_account_id,
                },
            },
            success_url: `${request.nextUrl.origin}/pay/${invoiceId}?success=true`,
            cancel_url: `${request.nextUrl.origin}/pay/${invoiceId}?canceled=true`,
            metadata: {
                invoice_id: invoiceId,
                professional_id: professional.id,
                invoice_number: invoice.invoice_number,
            },
        });

        return NextResponse.json({
            url: session.url,
            sessionId: session.id,
        });
    } catch (error: any) {
        console.error("Invoice checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar checkout de pagamento" },
            { status: 500 }
        );
    }
}

