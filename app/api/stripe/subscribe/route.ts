import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { PLANS, PlanName } from "@/lib/subscriptions/plans";

/**
 * Criar checkout session para assinatura
 * POST /api/stripe/subscribe
 * Body: { planId: 'essencial' | 'profissional' | 'premium', billingPeriod: 'monthly' | 'annual' }
 */
export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const { planId, billingPeriod = 'monthly' } = await request.json();

        if (!planId || !['essencial', 'profissional', 'premium'].includes(planId)) {
            return NextResponse.json(
                { error: "Plano inválido" },
                { status: 400 }
            );
        }

        const plan = PLANS[planId as PlanName];
        if (!plan) {
            return NextResponse.json(
                { error: "Plano não encontrado" },
                { status: 404 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Não autorizado" },
                { status: 401 }
            );
        }

        // Get professional
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, email, full_name, stripe_customer_id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json(
                { error: "Profissional não encontrado" },
                { status: 404 }
            );
        }

        // Get or create Stripe customer
        let customerId = professional.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: professional.email,
                name: professional.full_name,
                metadata: {
                    professional_id: professional.id,
                },
            });

            customerId = customer.id;

            // Save customer ID
            await supabase
                .from("professionals")
                .update({ stripe_customer_id: customerId })
                .eq("id", professional.id);
        }

        // Get price ID based on billing period
        const priceId = billingPeriod === 'annual' 
            ? plan.price_id_annual 
            : plan.price_id_monthly;

        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID não configurado para este plano. Configure as variáveis de ambiente STRIPE_PRICE_*" },
                { status: 500 }
            );
        }

        // Calculate trial period (14 days)
        const trialPeriodDays = 14;
        const trialEnd = Math.floor(Date.now() / 1000) + (trialPeriodDays * 24 * 60 * 60);

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: trialPeriodDays,
                metadata: {
                    professional_id: professional.id,
                    plan_id: planId,
                    billing_period: billingPeriod,
                },
            },
            success_url: `${request.nextUrl.origin}/dashboard/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.nextUrl.origin}/dashboard/settings/subscription?canceled=true`,
            metadata: {
                professional_id: professional.id,
                plan_id: planId,
            },
            allow_promotion_codes: true,
        });

        return NextResponse.json({ 
            url: session.url,
            sessionId: session.id 
        });
    } catch (error: any) {
        console.error("Subscription checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar checkout de assinatura" },
            { status: 500 }
        );
    }
}

