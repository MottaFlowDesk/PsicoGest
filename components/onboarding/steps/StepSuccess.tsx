"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function StepSuccess() {
    const router = useRouter();
    const { reset } = useOnboardingStore();
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

    useEffect(() => {
        // Check if there's a pending subscription to link
        const pendingSubscription = localStorage.getItem('pendingSubscription');
        
        if (pendingSubscription) {
            const { subscriptionId, planId, billingPeriod } = JSON.parse(pendingSubscription);
            
            // If we have subscriptionId, it means subscription was already created
            // Just remove from localStorage and continue to dashboard
            if (subscriptionId) {
                localStorage.removeItem('pendingSubscription');
                // Subscription will be linked by webhook or callback
                return;
            }
            
            // If we only have planId, create checkout (legacy flow)
            if (planId) {
                handleCreateCheckout(planId, billingPeriod);
            }
        }
    }, []);

    const handleCreateCheckout = async (planId: string, billingPeriod: string) => {
        setIsCreatingCheckout(true);
        try {
            const response = await fetch('/api/stripe/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planId,
                    billingPeriod,
                }),
            });

            const data = await response.json();

            if (response.ok && data.url) {
                // Remove pending subscription from localStorage
                localStorage.removeItem('pendingSubscription');
                // Redirect to Stripe Checkout
                window.location.href = data.url;
                return;
            } else {
                throw new Error(data.error || 'Erro ao criar checkout');
            }
        } catch (error: any) {
            console.error("Error creating checkout:", error);
            toast.error(error.message || 'Erro ao processar assinatura. Você pode escolher um plano depois no dashboard.');
            // Remove pending subscription even if it fails
            localStorage.removeItem('pendingSubscription');
            setIsCreatingCheckout(false);
        }
    };

    const handleGoToDashboard = () => {
        reset(); // Clear store (step 1)
        router.push("/dashboard");
        router.refresh(); // Ensure layout re-runs and sees the updated profile
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tudo Pronto!</h2>
            <p className="text-slate-500 mb-8">
                Seu perfil foi configurado com sucesso. Agora você já pode começar a gerenciar seus pacientes.
            </p>

            {isCreatingCheckout ? (
                <Button disabled className="w-full bg-brand-600 h-12 text-lg">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Redirecionando para pagamento...
                </Button>
            ) : (
                <Button onClick={handleGoToDashboard} className="w-full bg-brand-600 hover:bg-brand-700 h-12 text-lg">
                    Ir para o Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            )}
        </div>
    );
}
