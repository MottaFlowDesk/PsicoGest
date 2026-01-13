import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { PLANS, PlanName } from "@/lib/subscriptions/plans";

/**
 * Criar checkout session para assinatura (PÚBLICO - sem autenticação)
 * POST /api/stripe/checkout
 * Body: { planId: 'essencial' | 'profissional' | 'premium', billingPeriod: 'monthly' | 'annual', email?: string }
 * 
 * Este endpoint permite criar checkout sem estar autenticado.
 * Após o pagamento, o webhook criará a conta automaticamente.
 */
export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const { planId, billingPeriod = 'monthly', email } = await request.json();

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

        // Get price ID based on billing period
        const priceId = billingPeriod === 'annual' 
            ? plan.price_id_annual 
            : plan.price_id_monthly;

        if (!priceId || priceId.trim() === '') {
            return NextResponse.json(
                { 
                    error: `Price ID não configurado para o plano ${planId} (${billingPeriod}). Configure a variável de ambiente STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}`,
                    planId,
                    billingPeriod,
                    missingVariable: `STRIPE_PRICE_${planId.toUpperCase()}_${billingPeriod.toUpperCase()}`
                },
                { status: 500 }
            );
        }

        // Validate price ID format (should start with price_)
        if (!priceId.startsWith('price_')) {
            return NextResponse.json(
                { 
                    error: `Price ID inválido para o plano ${planId}. O Price ID deve começar com 'price_'. Valor atual: ${priceId}`,
                    planId,
                    billingPeriod,
                    invalidPriceId: priceId
                },
                { status: 500 }
            );
        }

        // Verify price exists in Stripe
        try {
            await stripe.prices.retrieve(priceId);
        } catch (priceError: any) {
            console.error(`Price ID ${priceId} não encontrado no Stripe:`, priceError);
            return NextResponse.json(
                { 
                    error: `Price ID não encontrado no Stripe: ${priceId}. Verifique se o produto foi criado corretamente e se a variável de ambiente está correta.`,
                    planId,
                    billingPeriod,
                    invalidPriceId: priceId,
                    stripeError: priceError.message
                },
                { status: 500 }
            );
        }

        // Calculate trial period (14 days)
        const trialPeriodDays = 14;

        // Create checkout session (sem customer - será criado após pagamento)
        const session = await stripe.checkout.sessions.create({
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
                    plan_id: planId,
                    billing_period: billingPeriod,
                    create_account: "true", // Flag para criar conta após pagamento
                },
            },
            customer_email: email || undefined, // Email opcional para pré-preencher
            success_url: `${request.nextUrl.origin}/auth/callback?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${request.nextUrl.origin}/#pricing?canceled=true`,
            metadata: {
                plan_id: planId,
                billing_period: billingPeriod,
                create_account: "true",
            },
            allow_promotion_codes: true,
        });

        return NextResponse.json({ 
            url: session.url,
            sessionId: session.id 
        });
    } catch (error: any) {
        console.error("Public checkout error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar checkout de assinatura" },
            { status: 500 }
        );
    }
}
