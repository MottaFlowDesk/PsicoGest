"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type MercadoPagoStatus = {
    configured: boolean;
    connected: boolean;
    mpUserId?: string;
    liveMode?: boolean;
};

const RESULT_MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
    success: { type: "success", text: "Conta Mercado Pago conectada." },
    denied: { type: "error", text: "Você cancelou a autorização no Mercado Pago." },
    oauth_error: { type: "error", text: "O Mercado Pago recusou a autorização." },
    not_configured: { type: "error", text: "Credenciais do Mercado Pago não configuradas." },
    invalid_state: { type: "error", text: "A autorização expirou. Tente conectar de novo." },
    session_mismatch: { type: "error", text: "Sessão diferente da que iniciou a conexão." },
    token_exchange: { type: "error", text: "Não foi possível concluir a conexão com o Mercado Pago." },
};

export function MercadoPagoConnectButton() {
    const [status, setStatus] = useState<MercadoPagoStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void checkStatus();
        announceResult();
    }, []);

    function announceResult() {
        const params = new URLSearchParams(window.location.search);
        const result = params.get("mp");
        if (!result) return;

        const reason = params.get("reason");
        const messageKey = result === "error" && reason ? reason : result;
        const message = RESULT_MESSAGES[messageKey] ?? {
            type: "error" as const,
            text: "Não foi possível conectar o Mercado Pago.",
        };
        if (message.type === "success") {
            toast.success(message.text);
        } else {
            toast.error(message.text);
        }

        params.delete("mp");
        params.delete("reason");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
    }

    async function checkStatus() {
        try {
            const response = await fetch("/api/mercadopago/connect");
            const data = (await response.json()) as MercadoPagoStatus;
            setStatus({
                configured: Boolean(data.configured),
                connected: Boolean(data.connected),
                mpUserId: data.mpUserId,
                liveMode: data.liveMode,
            });
        } catch (error) {
            console.error("Failed to check Mercado Pago status:", error);
            setStatus({ configured: false, connected: false });
        } finally {
            setLoading(false);
        }
    }

    async function handleConnect() {
        setBusy(true);
        try {
            const response = await fetch("/api/mercadopago/connect", { method: "POST" });
            const data = (await response.json()) as { url?: string; error?: string };

            if (!response.ok || !data.url) {
                throw new Error(data.error || "Erro ao conectar com o Mercado Pago");
            }

            window.location.href = data.url;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao conectar com o Mercado Pago");
            setBusy(false);
        }
    }

    async function handleDisconnect() {
        setBusy(true);
        try {
            const response = await fetch("/api/mercadopago/connect", { method: "DELETE" });
            if (!response.ok) {
                const data = (await response.json()) as { error?: string };
                throw new Error(data.error || "Erro ao desconectar");
            }
            setStatus((current) => ({
                configured: current?.configured ?? true,
                connected: false,
            }));
            toast.success("Conta Mercado Pago desconectada.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao desconectar o Mercado Pago");
        } finally {
            setBusy(false);
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

    if (!status?.configured) {
        return (
            <span className="text-xs text-slate-500">Mercado Pago não configurado</span>
        );
    }

    if (status.connected) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Conectado
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="h-7 px-2 text-xs text-slate-500"
                >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Desconectar"}
                </Button>
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={busy}
            className="h-7 text-xs"
        >
            {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Conectar
        </Button>
    );
}
