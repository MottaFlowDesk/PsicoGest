import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { InvoiceList } from "@/components/financial/invoice-list";
import { getFinancialSummary, getInvoices } from "./actions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link"; // Assuming we'll have a create page eventually

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
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financeiro</h1>
                    <p className="text-slate-500">Gestão de receitas e faturas.</p>
                </div>
                <Button disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Fatura
                </Button>
            </div>

            <Suspense fallback={<div>Carregando resumo...</div>}>
                <FinancialSummaryCards summary={summary} />
            </Suspense>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Faturas Recentes</h2>
                    {/* Filter controls could go here */}
                </div>
                <Suspense fallback={<div>Carregando faturas...</div>}>
                    <InvoiceList invoices={invoices} />
                </Suspense>
            </div>
        </div>
    );
}
