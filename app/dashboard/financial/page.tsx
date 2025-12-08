import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { InvoiceList } from "@/components/financial/invoice-list";
import { getFinancialSummary, getInvoices } from "./actions";
import { Button } from "@/components/ui/button";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";
import { Download, CreditCard, AlertCircle, Plus } from "lucide-react";

export default async function FinancialPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return <div>Unauthorized</div>;
    }

    // Parallel data fetching
    const [summary, invoices] = await Promise.all([
        getFinancialSummary(),
        getInvoices(),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
                    <p className="text-slate-500 text-sm mt-1">Controle de faturamento, recebimentos e notas fiscais.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar Relatório</span>
                    </button>
                    <NewInvoiceDialog />
                </div>
            </div>

            <Suspense fallback={<div>Carregando resumo...</div>}>
                <FinancialSummaryCards summary={summary} />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoices List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Faturas Recentes</h2>
                        <button className="text-brand-600 text-sm font-medium hover:text-brand-700">Ver todas</button>
                    </div>
                    <div className="overflow-x-auto">
                        <Suspense fallback={<div className="p-6">Carregando faturas...</div>}>
                            <InvoiceList invoices={invoices} />
                        </Suspense>
                    </div>
                </div>

                {/* Integration Status & Side Widgets */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-brand-600" />
                            Meios de Pagamento
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold text-xs">S</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Stripe</p>
                                        <p className="text-xs text-slate-500">Não conectado</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                    Configurar
                                </Button>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 opacity-75">
                                <p className="text-sm text-slate-600 font-medium mb-1">Próximo Repasse</p>
                                <h4 className="text-xl font-bold text-slate-400">R$ 0,00</h4>
                                <p className="text-xs text-slate-400 mt-1">Conecte sua conta para receber</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <AlertCircle size={20} className="text-orange-500" />
                            Pendências
                        </h3>
                        {summary.overdueCount > 0 ? (
                            <ul className="space-y-3">
                                <li className="text-sm text-slate-600 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                                    <span>Você tem <strong>{summary.overdueCount}</strong> faturas vencidas.</span>
                                </li>
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">Nenhuma pendência encontrada.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
