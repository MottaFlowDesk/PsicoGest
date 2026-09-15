import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle } from "lucide-react";
import { getPublicPayInvoice } from "@/lib/invoices/public-pay";
import { PayCheckoutButton } from "@/components/pay/pay-checkout-button";

function formatMoney(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

export default async function PayPage({
    params,
    searchParams,
}: {
    params: Promise<{ invoiceId: string }>;
    searchParams: Promise<{ mp?: string; payment_id?: string; collection_id?: string; status?: string }>;
}) {
    const { invoiceId } = await params;
    const query = await searchParams;

    let invoice: Awaited<ReturnType<typeof getPublicPayInvoice>> = null;
    let loadError: string | null = null;

    try {
        invoice = await getPublicPayInvoice(invoiceId);
        if (!invoice) loadError = "Fatura não encontrada";
    } catch {
        loadError = "Fatura não encontrada";
    }

    if (loadError || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle>Erro</CardTitle>
                        <CardDescription>{loadError}</CardDescription>
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
                        <CardDescription>Esta fatura já foi paga. Obrigado!</CardDescription>
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
                    <CardDescription>Fatura {invoice.invoice_number}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Profissional</span>
                            <span className="font-medium">{invoice.professional_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Paciente</span>
                            <span className="font-medium">{invoice.patient_name}</span>
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

                    <PayCheckoutButton
                        invoiceId={invoice.id}
                        returnStatus={query.mp}
                        paymentId={query.payment_id || query.collection_id}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
