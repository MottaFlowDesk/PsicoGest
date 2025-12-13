import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Use service role for webhook (no user context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function POST(request: NextRequest) {
    if (!isStripeConfigured() || !stripe) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
    } catch (error: any) {
        console.error("Webhook signature verification failed:", error.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(supabaseAdmin, session);
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentSucceeded(supabaseAdmin, paymentIntent);
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                handlePaymentFailed(paymentIntent);
                break;
            }

            case "account.updated": {
                const account = event.data.object as Stripe.Account;
                await handleAccountUpdated(supabaseAdmin, account);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("Webhook handler error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

type SupabaseAdminClient = ReturnType<typeof createClient>;

async function handleCheckoutCompleted(db: SupabaseAdminClient, session: Stripe.Checkout.Session) {
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
        console.error("No invoice ID in checkout session metadata");
        return;
    }

    if (session.payment_status === "paid") {
        await db
            .from("invoices")
            .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
                payment_method: "credit_card",
            })
            .eq("id", invoiceId);

        console.log(`Invoice ${invoiceId} marked as paid`);
    }
}

async function handlePaymentSucceeded(db: SupabaseAdminClient, paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) return;

    // Get or create payment record
    const { data: invoice } = await db
        .from("invoices")
        .select("professional_id, amount_cents")
        .eq("id", invoiceId)
        .single();

    if (!invoice) return;

    // Update invoice status if not already paid
    await db
        .from("invoices")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.latest_charge as string,
        })
        .eq("id", invoiceId)
        .eq("status", "pending");

    // Create payment record
    const applicationFee = paymentIntent.application_fee_amount || 0;
    const netAmount = paymentIntent.amount - applicationFee;

    await db.from("payments").insert({
        invoice_id: invoiceId,
        professional_id: invoice.professional_id,
        amount_cents: paymentIntent.amount,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        status: "succeeded",
        payment_method: "credit_card",
        stripe_fee_cents: applicationFee,
        net_amount_cents: netAmount,
        paid_at: new Date().toISOString(),
    });
}

function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) return;

    // Log the failed payment attempt
    console.log(`Payment failed for invoice ${invoiceId}:`, paymentIntent.last_payment_error?.message);
}

async function handleAccountUpdated(db: SupabaseAdminClient, account: Stripe.Account) {
    const professionalId = account.metadata?.professional_id;

    if (!professionalId) {
        // Try to find by stripe_account_id
        const { data: professional } = await db
            .from("professionals")
            .select("id")
            .eq("stripe_account_id", account.id)
            .single();

        if (!professional) return;

        // Update connection status
        if (account.charges_enabled && account.payouts_enabled) {
            await db
                .from("professionals")
                .update({
                    stripe_connected_at: new Date().toISOString(),
                })
                .eq("id", professional.id);
        }
    } else {
        if (account.charges_enabled && account.payouts_enabled) {
            await db
                .from("professionals")
                .update({
                    stripe_connected_at: new Date().toISOString(),
                })
                .eq("id", professionalId);
        }
    }
}

