"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StripeStatus {
    connected: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    notConfigured?: boolean;
    error?: string;
}

export function StripeConnectButton() {
    const [status, setStatus] = useState<StripeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const response = await fetch("/api/stripe/connect");
            if (!response.ok && response.status === 503) {
                // Stripe not configured
                setStatus({ connected: false, notConfigured: true } as StripeStatus);
                return;
            }
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error("Failed to check Stripe status:", error);
            setStatus({ connected: false } as StripeStatus);
        } finally {
            setLoading(false);
        }
    }

    async function handleConnect() {
        setConnecting(true);
        try {
            const response = await fetch("/api/stripe/connect", {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to connect");
            }

            // Redirect to Stripe onboarding
            window.location.href = data.url;
        } catch (error: any) {
            toast.error(error.message || "Erro ao conectar com Stripe");
            setConnecting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
            </div>
        );
    }

    if (status?.notConfigured) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="text-xs">Stripe não configurado</span>
            </div>
        );
    }

    if (status?.connected) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Conectado
            </div>
        );
    }

    if (status?.detailsSubmitted && !status?.connected) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Loader2 className="h-4 w-4" />
                    Verificação pendente
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full"
                >
                    {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Completar Configuração
                </Button>
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
            className="h-7 text-xs"
        >
            {connecting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Configurar
        </Button>
    );
}

