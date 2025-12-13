import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado. Configure STRIPE_SECRET_KEY no arquivo .env.local" },
                { status: 503 }
            );
        }

        const { invoiceId } = await request.json();

        if (!invoiceId) {
            return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Get invoice with professional and patient info
        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select(`
                *,
                professionals:professional_id (
                    id,
                    full_name,
                    stripe_account_id
                ),
                patients:patient_id (
                    full_name,
                    email
                )
            `)
            .eq("id", invoiceId)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.status === "paid") {
            return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
        }

        if (invoice.status === "cancelled") {
            return NextResponse.json({ error: "Invoice is cancelled" }, { status: 400 });
        }

        const professional = invoice.professionals;
        const patient = invoice.patients;

        if (!professional?.stripe_account_id) {
            return NextResponse.json(
                { error: "Professional has not connected Stripe account" },
                { status: 400 }
            );
        }

        // Platform fee (e.g., 5%)
        const platformFeePercent = 5;
        const applicationFee = Math.round(invoice.amount_cents * (platformFeePercent / 100));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: `Fatura ${invoice.invoice_number}`,
                            description: invoice.description || `Sessão com ${professional.full_name}`,
                        },
                        unit_amount: invoice.amount_cents,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: applicationFee,
                transfer_data: {
                    destination: professional.stripe_account_id,
                },
                metadata: {
                    invoice_id: invoice.id,
                    professional_id: professional.id,
                },
            },
            customer_email: patient?.email || undefined,
            success_url: `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/payment/cancelled?invoice=${invoice.id}`,
            metadata: {
                invoice_id: invoice.id,
                professional_id: professional.id,
            },
        });

        // Update invoice with payment intent
        await supabase
            .from("invoices")
            .update({
                stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq("id", invoice.id);

        return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
        console.error("Checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}

// Generate payment link (shareable)
export async function GET(request: NextRequest) {
    const invoiceId = request.nextUrl.searchParams.get("invoiceId");

    if (!invoiceId) {
        return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        const { data: invoice } = await supabase
            .from("invoices")
            .select(`
                *,
                professionals:professional_id (
                    full_name,
                    stripe_account_id
                )
            `)
            .eq("id", invoiceId)
            .single();

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (!invoice.professionals?.stripe_account_id) {
            return NextResponse.json(
                { error: "Payment not available - professional needs to connect Stripe" },
                { status: 400 }
            );
        }

        // Return checkout URL (patient will use this)
        const checkoutUrl = `${request.nextUrl.origin}/pay/${invoiceId}`;

        return NextResponse.json({ url: checkoutUrl });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

