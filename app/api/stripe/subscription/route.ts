import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

/**
 * Obter informações da assinatura atual
 * GET /api/stripe/subscription
 */
export async function GET(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
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
            .select("id, stripe_customer_id, subscription_plan, subscription_status")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json(
                { error: "Profissional não encontrado" },
                { status: 404 }
            );
        }

        // Get subscription from database
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("professional_id", professional.id)
            .single();

        if (!subscription) {
            return NextResponse.json({
                hasSubscription: false,
                plan: professional.subscription_plan || 'free',
                status: 'free',
            });
        }

        return NextResponse.json({
            hasSubscription: true,
            plan: subscription.plan_name,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            trialEnd: subscription.trial_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at,
        });
    } catch (error: any) {
        console.error("Get subscription error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao obter assinatura" },
            { status: 500 }
        );
    }
}

/**
 * Cancelar assinatura
 * DELETE /api/stripe/subscription
 */
export async function DELETE(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
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
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json(
                { error: "Profissional não encontrado" },
                { status: 404 }
            );
        }

        // Get subscription
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_subscription_id")
            .eq("professional_id", professional.id)
            .single();

        if (!subscription) {
            return NextResponse.json(
                { error: "Assinatura não encontrada" },
                { status: 404 }
            );
        }

        // Cancel subscription in Stripe (at period end)
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
        });

        // Update in database
        await supabase
            .from("subscriptions")
            .update({
                cancel_at_period_end: true,
            })
            .eq("professional_id", professional.id);

        return NextResponse.json({ 
            success: true,
            message: "Assinatura será cancelada ao final do período atual"
        });
    } catch (error: any) {
        console.error("Cancel subscription error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao cancelar assinatura" },
            { status: 500 }
        );
    }
}

/**
 * Reativar assinatura cancelada
 * POST /api/stripe/subscription/reactivate
 */
export async function POST(request: NextRequest) {
    try {
        const { action } = await request.json();

        if (action !== 'reactivate') {
            return NextResponse.json(
                { error: "Ação inválida" },
                { status: 400 }
            );
        }

        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado" },
                { status: 503 }
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
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json(
                { error: "Profissional não encontrado" },
                { status: 404 }
            );
        }

        // Get subscription
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_subscription_id")
            .eq("professional_id", professional.id)
            .single();

        if (!subscription) {
            return NextResponse.json(
                { error: "Assinatura não encontrada" },
                { status: 404 }
            );
        }

        // Reactivate subscription in Stripe
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: false,
        });

        // Update in database
        await supabase
            .from("subscriptions")
            .update({
                cancel_at_period_end: false,
                canceled_at: null,
            })
            .eq("professional_id", professional.id);

        return NextResponse.json({ 
            success: true,
            message: "Assinatura reativada com sucesso"
        });
    } catch (error: any) {
        console.error("Reactivate subscription error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao reativar assinatura" },
            { status: 500 }
        );
    }
}

