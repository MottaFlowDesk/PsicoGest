"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    CreditCard,
    Calendar,
    AlertCircle,
    Crown,
    Sparkles,
    Users,
    MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/subscriptions/plans";

interface SubscriptionData {
    hasSubscription: boolean;
    plan: string;
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    trialEnd?: string;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string;
}

export default function SubscriptionPage() {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [canceling, setCanceling] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        fetchSubscription();
        
        // Check for success/cancel from checkout
        if (searchParams.get("success")) {
            toast.success("Assinatura ativada com sucesso! 🎉");
            router.replace("/dashboard/settings/subscription");
        }
        if (searchParams.get("canceled")) {
            toast.info("Assinatura cancelada. Você pode tentar novamente quando quiser.");
            router.replace("/dashboard/settings/subscription");
        }
    }, []);

    async function fetchSubscription() {
        setLoading(true);
        try {
            const response = await fetch("/api/stripe/subscription");
            const data = await response.json();
            setSubscription(data);
        } catch (error) {
            console.error("Error fetching subscription:", error);
            toast.error("Erro ao carregar informações da assinatura");
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel() {
        if (!confirm("Tem certeza que deseja cancelar sua assinatura? Ela continuará ativa até o final do período atual.")) {
            return;
        }

        setCanceling(true);
        try {
            const response = await fetch("/api/stripe/subscription", {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao cancelar assinatura");
            }

            toast.success("Assinatura será cancelada ao final do período atual");
            fetchSubscription();
        } catch (error: any) {
            toast.error(error.message || "Erro ao cancelar assinatura");
        } finally {
            setCanceling(false);
        }
    }

    async function handleReactivate() {
        setReactivating(true);
        try {
            const response = await fetch("/api/stripe/subscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ action: "reactivate" }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao reativar assinatura");
            }

            toast.success("Assinatura reativada com sucesso!");
            fetchSubscription();
        } catch (error: any) {
            toast.error(error.message || "Erro ao reativar assinatura");
        } finally {
            setReactivating(false);
        }
    }

    async function handleUpgrade(planId: string) {
        try {
            const response = await fetch("/api/stripe/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    planId,
                    billingPeriod: "monthly",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao processar upgrade");
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar upgrade");
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    const currentPlan = subscription?.plan ? PLANS[subscription.plan as keyof typeof PLANS] : null;
    const isActive = subscription?.status === "active" || subscription?.status === "trialing";
    const isCanceled = subscription?.cancelAtPeriodEnd || subscription?.status === "canceled";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Assinatura</h1>
                <p className="text-sm text-slate-500">
                    Gerencie seu plano e assinatura
                </p>
            </div>

            {/* Current Subscription */}
            {subscription?.hasSubscription && currentPlan ? (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-brand-600" />
                                    Plano {currentPlan.name}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {currentPlan.description}
                                </CardDescription>
                            </div>
                            <Badge
                                variant={
                                    isActive && !isCanceled
                                        ? "default"
                                        : isCanceled
                                        ? "destructive"
                                        : "secondary"
                                }
                                className="text-sm"
                            >
                                {subscription.status === "trialing" && "Em Trial"}
                                {subscription.status === "active" && !isCanceled && "Ativo"}
                                {isCanceled && "Cancelado"}
                                {subscription.status === "past_due" && "Pagamento Pendente"}
                                {subscription.status === "unpaid" && "Não Pago"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Subscription Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subscription.currentPeriodEnd && (
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {isCanceled ? "Expira em" : "Renova em"}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {format(
                                                new Date(subscription.currentPeriodEnd),
                                                "dd 'de' MMMM 'de' yyyy",
                                                { locale: ptBR }
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-900">
                                            Trial termina em
                                        </p>
                                        <p className="text-sm text-blue-600">
                                            {format(
                                                new Date(subscription.trialEnd),
                                                "dd 'de' MMMM 'de' yyyy",
                                                { locale: ptBR }
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Plan Features */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                Recursos incluídos:
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {currentPlan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            {isCanceled ? (
                                <Button
                                    onClick={handleReactivate}
                                    disabled={reactivating}
                                    className="bg-brand-600 hover:bg-brand-700"
                                >
                                    {reactivating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Reativando...
                                        </>
                                    ) : (
                                        "Reativar Assinatura"
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCancel}
                                    disabled={canceling}
                                    variant="destructive"
                                >
                                    {canceling ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Cancelando...
                                        </>
                                    ) : (
                                        "Cancelar Assinatura"
                                    )}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => router.push("/#pricing")}
                            >
                                Ver Planos
                            </Button>
                        </div>

                        {isCanceled && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-orange-900">
                                            Assinatura será cancelada
                                        </p>
                                        <p className="text-sm text-orange-700 mt-1">
                                            Sua assinatura continuará ativa até{" "}
                                            {subscription.currentPeriodEnd &&
                                                format(
                                                    new Date(subscription.currentPeriodEnd),
                                                    "dd 'de' MMMM 'de' yyyy",
                                                    { locale: ptBR }
                                                )}
                                            . Após essa data, você voltará para o plano gratuito.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                /* No Subscription - Show Plans */
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Você não possui uma assinatura ativa</CardTitle>
                            <CardDescription>
                                Escolha um plano para desbloquear todos os recursos do PsicoGuest
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => router.push("/#pricing")}
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                Ver Planos e Preços
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Available Plans */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {Object.values(PLANS)
                            .filter((plan) => plan.id !== "free")
                            .map((plan) => (
                                <Card key={plan.id} className="relative">
                                    {plan.popular && (
                                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                            <Badge className="bg-brand-600">Mais Popular</Badge>
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                        <CardDescription>{plan.description}</CardDescription>
                                        <div className="mt-4">
                                            <span className="text-3xl font-bold text-slate-900">
                                                {formatPrice(plan.price_monthly)}
                                            </span>
                                            <span className="text-slate-500">/mês</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 mb-4">
                                            {plan.features.slice(0, 4).map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            onClick={() => handleUpgrade(plan.id)}
                                            className="w-full"
                                            variant={plan.popular ? "default" : "outline"}
                                        >
                                            Escolher {plan.name}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

