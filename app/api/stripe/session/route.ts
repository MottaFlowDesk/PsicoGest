import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

/**
 * Obter informações de uma sessão de checkout do Stripe
 * GET /api/stripe/session?session_id=...
 */
export async function GET(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const sessionId = request.nextUrl.searchParams.get("session_id");

        if (!sessionId) {
            return NextResponse.json(
                { error: "session_id é obrigatório" },
                { status: 400 }
            );
        }

        // Retrieve checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer'],
        });

        // Get subscription if exists
        const subscription = session.subscription 
            ? typeof session.subscription === 'string'
                ? await stripe.subscriptions.retrieve(session.subscription)
                : session.subscription
            : null;

        // Get customer email
        let customerEmail: string | null = null;
        if (session.customer_details?.email) {
            customerEmail = session.customer_details.email;
        } else if (session.customer) {
            const customer = typeof session.customer === 'string'
                ? await stripe.customers.retrieve(session.customer)
                : session.customer;
            customerEmail = (customer as any).email || null;
        }

        // Get plan info from metadata
        const planId = session.metadata?.plan_id || subscription?.metadata?.plan_id || null;
        const billingPeriod = session.metadata?.billing_period || subscription?.metadata?.billing_period || 'monthly';

        return NextResponse.json({
            sessionId: session.id,
            customerEmail,
            subscriptionId: subscription?.id || null,
            planId,
            billingPeriod,
            paymentStatus: session.payment_status,
            subscriptionStatus: subscription?.status || null,
        });
    } catch (error: any) {
        console.error("Get session error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao obter informações da sessão" },
            { status: 500 }
        );
    }
}

