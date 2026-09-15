"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PayPageProps {
    params: Promise<{
        invoiceId: string;
    }>;
}

export default function PayPage({ params }: PayPageProps) {
    const { invoiceId } = use(params);
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchInvoice();
    }, [invoiceId]);

    async function fetchInvoice() {
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select(`
                    *,
                    professionals:professional_id (
                        full_name
                    ),
                    patients:patient_id (
                        full_name
                    )
                `)
                .eq("id", invoiceId)
                .single();

            if (error) throw error;
            setInvoice(data);
        } catch {
            setError("Fatura não encontrada");
        } finally {
            setLoading(false);
        }
    }

    const formatMoney = (cents: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle>Erro</CardTitle>
                        <CardDescription>{error || "Fatura não encontrada"}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (invoice.status === "paid") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <CardTitle>Fatura Paga</CardTitle>
                        <CardDescription>
                            Esta fatura já foi paga. Obrigado!
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (invoice.status === "cancelled") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <CardTitle>Fatura Cancelada</CardTitle>
                        <CardDescription>
                            Esta fatura foi cancelada e não pode mais ser paga.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Pagamento de Fatura</CardTitle>
                    <CardDescription>
                        Fatura {invoice.invoice_number}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Profissional</span>
                            <span className="font-medium">{invoice.professionals?.full_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Paciente</span>
                            <span className="font-medium">{invoice.patients?.full_name}</span>
                        </div>
                        {invoice.description && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Descrição</span>
                                <span className="font-medium">{invoice.description}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Vencimento</span>
                            <span className="font-medium">
                                {new Date(invoice.due_date).toLocaleDateString("pt-BR")}
                            </span>
                        </div>
                    </div>

                    <div className="text-center py-4 border-t border-b">
                        <p className="text-sm text-slate-500 mb-1">Valor Total</p>
                        <p className="text-3xl font-bold text-slate-900">
                            {formatMoney(invoice.amount_cents)}
                        </p>
                    </div>

                    <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm text-center">
                        O pagamento online está temporariamente indisponível. Entre em
                        contato com {invoice.professionals?.full_name} para outras formas
                        de pagamento.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
