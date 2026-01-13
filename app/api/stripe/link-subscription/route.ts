import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Vincular assinatura existente a um profissional
 * POST /api/stripe/link-subscription
 * Body: { subscriptionId: string, userId: string }
 */
export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
            );
        }

        const { subscriptionId, userId } = await request.json();

        if (!subscriptionId || !userId) {
            return NextResponse.json(
                { error: "subscriptionId e userId são obrigatórios" },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        
        // Get professional by user_id
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, email")
            .eq("user_id", userId)
            .single();

        if (!professional) {
            return NextResponse.json(
                { error: "Profissional não encontrado" },
                { status: 404 }
            );
        }

        // Get subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const planId = subscription.metadata?.plan_id || subscription.items.data[0]?.price.metadata?.plan_id || 'essencial';

        // Get or create Stripe customer
        let customerId = subscription.customer as string;
        
        // Update professional with customer_id
        await supabase
            .from("professionals")
            .update({
                stripe_customer_id: customerId,
            })
            .eq("id", professional.id);

        // Create or update subscription record
        await supabase.from("subscriptions").upsert({
            professional_id: professional.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            plan_name: planId,
            status: subscription.status,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            trial_start: (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000).toISOString() : null,
            trial_end: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
            metadata: subscription.metadata,
        }, {
            onConflict: 'stripe_subscription_id',
        });

        // Update professional subscription info
        await supabase
            .from("professionals")
            .update({
                subscription_plan: planId,
                subscription_status: subscription.status,
                subscription_trial_ends_at: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
                subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq("id", professional.id);

        return NextResponse.json({ 
            success: true,
            message: "Assinatura vinculada com sucesso"
        });
    } catch (error: any) {
        console.error("Link subscription error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao vincular assinatura" },
            { status: 500 }
        );
    }
}

