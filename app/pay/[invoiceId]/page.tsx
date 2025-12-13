"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
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
    const [paying, setPaying] = useState(false);
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
                        full_name,
                        stripe_account_id
                    ),
                    patients:patient_id (
                        full_name
                    )
                `)
                .eq("id", invoiceId)
                .single();

            if (error) throw error;
            setInvoice(data);
        } catch (err: any) {
            setError("Fatura não encontrada");
        } finally {
            setLoading(false);
        }
    }

    async function handlePayment() {
        setPaying(true);
        setError(null);

        try {
            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao processar pagamento");
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } catch (err: any) {
            setError(err.message);
            setPaying(false);
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

    if (!invoice.professionals?.stripe_account_id) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <CardTitle>Pagamento Indisponível</CardTitle>
                        <CardDescription>
                            O pagamento online ainda não está configurado. Entre em contato com {invoice.professionals?.full_name} para outras formas de pagamento.
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

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-brand-600 hover:bg-brand-700"
                        size="lg"
                        onClick={handlePayment}
                        disabled={paying}
                    >
                        {paying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pagar com Cartão
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

