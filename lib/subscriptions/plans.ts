/**
 * Configuração dos Planos de Assinatura do PsicoGuest
 * 
 * Os planos são definidos aqui e devem corresponder aos produtos criados no Stripe.
 * Após criar os produtos no Stripe, atualize os price_id de cada plano.
 */

export type PlanName = 'essencial' | 'profissional' | 'premium' | 'free';

export interface PlanLimits {
    max_patients: number; // 0 = ilimitado (premium), 999999 = ilimitado
    max_ai_hours_per_month: number; // 0 = sem IA, 999999 = ilimitado
    whatsapp_reminders: boolean;
    ai_transcription: boolean;
    priority_support: boolean;
    unlimited_patients: boolean;
    unlimited_ai: boolean;
}

export interface Plan {
    id: PlanName;
    name: string;
    description: string;
    price_monthly: number; // em centavos (R$ 97,00 = 9700)
    price_annual: number; // em centavos (com 20% desconto)
    price_id_monthly: string; // Stripe Price ID - será configurado após criar no Stripe
    price_id_annual: string; // Stripe Price ID - será configurado após criar no Stripe
    features: string[];
    limits: PlanLimits;
    popular?: boolean;
}

export const PLANS: Record<PlanName, Plan> = {
    free: {
        id: 'free',
        name: 'Gratuito',
        description: 'Plano básico para testar a plataforma.',
        price_monthly: 0,
        price_annual: 0,
        price_id_monthly: '',
        price_id_annual: '',
        features: [
            'Até 5 pacientes',
            'Agenda e prontuário',
            'Confirmação por link',
            'Lembretes por e-mail',
            'Suporte por e-mail'
        ],
        limits: {
            max_patients: 5,
            max_ai_hours_per_month: 0,
            // WhatsApp passou a ser da plataforma (WABA única), disponível em todos os planos
            whatsapp_reminders: true,
            ai_transcription: false,
            priority_support: false,
            unlimited_patients: false,
            unlimited_ai: false,
        },
    },
    essencial: {
        id: 'essencial',
        name: 'Essencial',
        description: 'Para quem está começando a organizar o consultório.',
        price_monthly: 9700, // R$ 97,00
        price_annual: 7760, // R$ 77,60 (20% off)
        price_id_monthly: process.env.STRIPE_PRICE_ESSENCIAL_MONTHLY || '',
        price_id_annual: process.env.STRIPE_PRICE_ESSENCIAL_ANNUAL || '',
        features: [
            '60 pacientes',
            'Agenda, prontuário e teleconsulta (Google Meet)',
            'Dashboard financeiro e pagamentos',
            'Google Calendar e Gmail',
            'Confirmação por link e lembretes por e-mail',
            'Suporte por e-mail'
        ],
        limits: {
            max_patients: 60,
            max_ai_hours_per_month: 0,
            whatsapp_reminders: true,
            ai_transcription: false,
            priority_support: false,
            unlimited_patients: false,
            unlimited_ai: false,
        },
    },
    profissional: {
        id: 'profissional',
        name: 'Profissional',
        description: 'Ideal para psicólogos com agenda cheia.',
        price_monthly: 14700, // R$ 147,00
        price_annual: 11760, // R$ 117,60 (20% off)
        price_id_monthly: process.env.STRIPE_PRICE_PROFISSIONAL_MONTHLY || '',
        price_id_annual: process.env.STRIPE_PRICE_PROFISSIONAL_ANNUAL || '',
        features: [
            'Tudo do Essencial',
            'Até 120 pacientes',
            'Relatórios e exportação PDF/Excel',
            'Suporte prioritário'
        ],
        limits: {
            max_patients: 120,
            max_ai_hours_per_month: 10,
            whatsapp_reminders: true,
            ai_transcription: true,
            priority_support: true,
            unlimited_patients: false,
            unlimited_ai: false,
        },
        popular: true,
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        description: 'Para quem busca máxima eficiência e escala.',
        price_monthly: 24700, // R$ 247,00
        price_annual: 19760, // R$ 197,60 (20% off)
        price_id_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
        price_id_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
        features: [
            'Tudo do Profissional',
            'Pacientes ilimitados',
            'Suporte prioritário estendido'
        ],
        limits: {
            max_patients: 999999,
            max_ai_hours_per_month: 999999,
            whatsapp_reminders: true,
            ai_transcription: true,
            priority_support: true,
            unlimited_patients: true,
            unlimited_ai: true,
        },
    },
};

/**
 * Obter informações de um plano
 */
export function getPlan(planId: PlanName): Plan {
    return PLANS[planId] || PLANS.free;
}

/**
 * Obter limites de um plano
 */
export function getPlanLimits(planId: PlanName): PlanLimits {
    return PLANS[planId]?.limits || PLANS.free.limits;
}

/**
 * Verificar se um plano tem uma feature
 */
export function hasFeature(planId: PlanName, feature: keyof PlanLimits): boolean {
    const limits = getPlanLimits(planId);
    return limits[feature] === true || (typeof limits[feature] === 'number' && limits[feature] > 0);
}

/**
 * Verificar se pode adicionar mais pacientes
 */
export function canAddPatient(planId: PlanName, currentPatientCount: number): boolean {
    const limits = getPlanLimits(planId);
    if (limits.unlimited_patients) return true;
    return currentPatientCount < limits.max_patients;
}

/**
 * Verificar se pode usar IA
 */
export function canUseAI(planId: PlanName, aiHoursUsedThisMonth: number): boolean {
    const limits = getPlanLimits(planId);
    if (!limits.ai_transcription) return false;
    if (limits.unlimited_ai) return true;
    return aiHoursUsedThisMonth < limits.max_ai_hours_per_month;
}

/**
 * Obter todos os planos pagos (excluindo free)
 */
export function getPaidPlans(): Plan[] {
    return Object.values(PLANS).filter(plan => plan.id !== 'free');
}

/**
 * Formatar preço para exibição
 */
export function formatPrice(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

