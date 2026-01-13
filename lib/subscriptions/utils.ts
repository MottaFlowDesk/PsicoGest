import { createClient } from "@/lib/supabase/server";
import { PlanName, getPlanLimits, canAddPatient, canUseAI } from "./plans";

/**
 * Obter o plano atual do profissional
 */
export async function getCurrentPlan(professionalId: string): Promise<PlanName> {
    const supabase = await createClient();
    
    const { data: professional } = await supabase
        .from("professionals")
        .select("subscription_plan")
        .eq("id", professionalId)
        .single();

    return (professional?.subscription_plan as PlanName) || 'free';
}

/**
 * Verificar se o profissional pode adicionar mais pacientes
 */
export async function checkCanAddPatient(professionalId: string): Promise<{
    canAdd: boolean;
    currentCount: number;
    maxAllowed: number;
    planName: PlanName;
}> {
    const supabase = await createClient();
    const planName = await getCurrentPlan(professionalId);
    const limits = getPlanLimits(planName);

    // Contar pacientes ativos
    const { count } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", professionalId)
        .eq("archived", false);

    const currentCount = count || 0;
    const maxAllowed = limits.unlimited_patients ? 999999 : limits.max_patients;
    const canAdd = canAddPatient(planName, currentCount);

    return {
        canAdd,
        currentCount,
        maxAllowed,
        planName,
    };
}

/**
 * Verificar se o profissional pode usar IA
 */
export async function checkCanUseAI(professionalId: string): Promise<{
    canUse: boolean;
    hoursUsed: number;
    maxHours: number;
    planName: PlanName;
}> {
    const supabase = await createClient();
    const planName = await getCurrentPlan(professionalId);
    const limits = getPlanLimits(planName);

    if (!limits.ai_transcription) {
        return {
            canUse: false,
            hoursUsed: 0,
            maxHours: 0,
            planName,
        };
    }

    // Calcular horas de IA usadas no mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usage } = await supabase
        .from("ai_usage_logs")
        .select("duration_seconds")
        .eq("professional_id", professionalId)
        .eq("success", true)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

    const totalSeconds = usage?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) || 0;
    const hoursUsed = totalSeconds / 3600;
    const maxHours = limits.unlimited_ai ? 999999 : limits.max_ai_hours_per_month;

    return {
        canUse: canUseAI(planName, hoursUsed),
        hoursUsed: Math.round(hoursUsed * 100) / 100, // 2 casas decimais
        maxHours,
        planName,
    };
}

/**
 * Verificar se o profissional tem WhatsApp habilitado
 */
export async function hasWhatsAppFeature(professionalId: string): Promise<boolean> {
    const planName = await getCurrentPlan(professionalId);
    const limits = getPlanLimits(planName);
    return limits.whatsapp_reminders;
}

/**
 * Verificar status da assinatura
 */
export async function getSubscriptionStatus(professionalId: string): Promise<{
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'free';
    planName: PlanName;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
}> {
    const supabase = await createClient();

    const { data: professional } = await supabase
        .from("professionals")
        .select("subscription_plan, subscription_status, subscription_trial_ends_at, subscription_current_period_end")
        .eq("id", professionalId)
        .single();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, trial_end, current_period_end, cancel_at_period_end")
        .eq("professional_id", professionalId)
        .single();

    const planName = (professional?.subscription_plan as PlanName) || 'free';
    const status = subscription?.status || professional?.subscription_status || 'free';

    return {
        status: status as any,
        planName,
        trialEndsAt: subscription?.trial_end ? new Date(subscription.trial_end) : (professional?.subscription_trial_ends_at ? new Date(professional.subscription_trial_ends_at) : null),
        currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : (professional?.subscription_current_period_end ? new Date(professional.subscription_current_period_end) : null),
        cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    };
}

