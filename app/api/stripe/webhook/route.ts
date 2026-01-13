import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Use service role for webhook (no user context)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin: SupabaseClient<any> | null = supabaseUrl && supabaseServiceKey 
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
                // Check if it's a subscription checkout
                if (session.mode === "subscription" && session.subscription) {
                    await handleSubscriptionCheckoutCompleted(supabaseAdmin, session);
                } else {
                    await handleCheckoutCompleted(supabaseAdmin, session);
                }
                break;
            }

            case "customer.subscription.created": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionCreated(supabaseAdmin, subscription);
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(supabaseAdmin, subscription);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(supabaseAdmin, subscription);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = SupabaseClient<any>;

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

// Subscription handlers
async function handleSubscriptionCheckoutCompleted(db: SupabaseAdminClient, session: Stripe.Checkout.Session) {
    const professionalId = session.metadata?.professional_id;
    const planId = session.metadata?.plan_id;

    if (!professionalId || !planId) {
        console.error("Missing metadata in subscription checkout session");
        return;
    }

    // Subscription will be created via customer.subscription.created event
    // This handler just logs the checkout completion
    console.log(`Subscription checkout completed for professional ${professionalId}, plan ${planId}`);
}

async function handleSubscriptionCreated(db: SupabaseAdminClient, subscription: Stripe.Subscription) {
    const professionalId = subscription.metadata?.professional_id;
    const planId = subscription.metadata?.plan_id;

    if (!professionalId) {
        // Try to find by customer_id
        const { data: professional } = await db
            .from("professionals")
            .select("id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();

        if (!professional) {
            console.error("Professional not found for subscription:", subscription.id);
            return;
        }

        // Get plan from subscription metadata or default
        const planName = planId || subscription.items.data[0]?.price.metadata?.plan_id || 'essencial';

        // Create subscription record
        await db.from("subscriptions").upsert({
            professional_id: professional.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            plan_name: planName,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            metadata: subscription.metadata,
        }, {
            onConflict: 'stripe_subscription_id',
        });

        // Update professional
        await db
            .from("professionals")
            .update({
                subscription_plan: planName,
                subscription_status: subscription.status,
                subscription_trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", professional.id);

        console.log(`Subscription created for professional ${professional.id}`);
    } else {
        const planName = planId || subscription.items.data[0]?.price.metadata?.plan_id || 'essencial';

        // Create subscription record
        await db.from("subscriptions").upsert({
            professional_id: professionalId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            plan_name: planName,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            metadata: subscription.metadata,
        }, {
            onConflict: 'stripe_subscription_id',
        });

        // Update professional
        await db
            .from("professionals")
            .update({
                subscription_plan: planName,
                subscription_status: subscription.status,
                subscription_trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", professionalId);

        console.log(`Subscription created for professional ${professionalId}`);
    }
}

async function handleSubscriptionUpdated(db: SupabaseAdminClient, subscription: Stripe.Subscription) {
    const professionalId = subscription.metadata?.professional_id;

    if (!professionalId) {
        // Find by subscription ID
        const { data: sub } = await db
            .from("subscriptions")
            .select("professional_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

        if (!sub) {
            console.error("Subscription not found in database:", subscription.id);
            return;
        }

        professionalId = sub.professional_id;
    }

    const planName = subscription.metadata?.plan_id || subscription.items.data[0]?.price.metadata?.plan_id || 'essencial';

    // Update subscription record
    await db
        .from("subscriptions")
        .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            plan_name: planName,
            metadata: subscription.metadata,
        })
        .eq("stripe_subscription_id", subscription.id);

    // Update professional
    await db
        .from("professionals")
        .update({
            subscription_plan: planName,
            subscription_status: subscription.status,
            subscription_trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("id", professionalId);

    console.log(`Subscription updated for professional ${professionalId}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(db: SupabaseAdminClient, subscription: Stripe.Subscription) {
    const professionalId = subscription.metadata?.professional_id;

    if (!professionalId) {
        // Find by subscription ID
        const { data: sub } = await db
            .from("subscriptions")
            .select("professional_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

        if (!sub) {
            console.error("Subscription not found in database:", subscription.id);
            return;
        }

        professionalId = sub.professional_id;
    }

    // Update subscription status
    await db
        .from("subscriptions")
        .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

    // Update professional to free plan
    await db
        .from("professionals")
        .update({
            subscription_plan: 'free',
            subscription_status: 'canceled',
            subscription_trial_ends_at: null,
            subscription_current_period_end: null,
        })
        .eq("id", professionalId);

    console.log(`Subscription deleted for professional ${professionalId}`);
}

