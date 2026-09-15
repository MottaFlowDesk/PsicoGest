import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id, subscription_plan, subscription_status")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!professional) {
            return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
        }

        const { data: subscription } = await supabase
            .from("subscriptions")
            .select(
                "plan_name, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, canceled_at"
            )
            .eq("professional_id", professional.id)
            .maybeSingle();

        if (!subscription) {
            return NextResponse.json({
                hasSubscription: false,
                plan: professional.subscription_plan || "free",
                status: professional.subscription_status || "free",
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
    } catch (error) {
        console.error("Get subscription error:", error);
        return NextResponse.json(
            { error: "Erro ao obter assinatura" },
            { status: 500 }
        );
    }
}
