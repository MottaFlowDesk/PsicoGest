"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PayCheckoutButtonProps = {
    invoiceId: string;
    returnStatus?: string | null;
    paymentId?: string | null;
};

export function PayCheckoutButton({
    invoiceId,
    returnStatus,
    paymentId,
}: PayCheckoutButtonProps) {
    const [busy, setBusy] = useState(false);
    const [syncing, setSyncing] = useState(Boolean(paymentId && returnStatus === "success"));

    useEffect(() => {
        if (!paymentId || returnStatus !== "success") return;

        void (async () => {
            try {
                const response = await fetch(`/api/pay/${invoiceId}/sync`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId }),
                });
                if (response.ok) {
                    window.location.replace(`/pay/${invoiceId}`);
                    return;
                }
            } catch (error) {
                console.error("Failed to sync Mercado Pago payment:", error);
            } finally {
                setSyncing(false);
            }
        })();
    }, [invoiceId, paymentId, returnStatus]);

    async function handlePay() {
        setBusy(true);
        try {
            const response = await fetch(`/api/pay/${invoiceId}/checkout`, { method: "POST" });
            const data = (await response.json()) as { url?: string; error?: string };
            if (!response.ok || !data.url) {
                throw new Error(data.error || "Não foi possível abrir o checkout");
            }
            window.location.href = data.url;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível abrir o checkout");
            setBusy(false);
        }
    }

    if (syncing) {
        return (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando pagamento...
            </div>
        );
    }

    if (returnStatus === "pending") {
        return (
            <p className="text-sm text-center text-amber-700 bg-amber-50 rounded-lg p-3">
                Pagamento pendente. Se você escolheu PIX, ele pode levar alguns instantes
                para confirmar.
            </p>
        );
    }

    if (returnStatus === "failure") {
        return (
            <div className="space-y-3">
                <p className="text-sm text-center text-red-700 bg-red-50 rounded-lg p-3">
                    O pagamento não foi concluído. Você pode tentar de novo.
                </p>
                <Button className="w-full" onClick={handlePay} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tentar pagar novamente"}
                </Button>
            </div>
        );
    }

    return (
        <Button className="w-full" onClick={handlePay} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pagar com Mercado Pago"}
        </Button>
    );
}
