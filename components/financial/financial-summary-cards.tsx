import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, AlertCircle } from "lucide-react";
import { DashboardSummary } from "@/app/dashboard/financial/actions";

interface FinancialSummaryCardsProps {
    summary: DashboardSummary;
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
    const formatMoney = (val: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(val);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        Receita (Este Mês)
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{formatMoney(summary.revenue)}</div>
                    <p className="text-xs text-slate-500 mt-1">
                        Valor efetivamente recebido
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        A Receber (Pendente)
                    </CardTitle>
                    <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{formatMoney(summary.pending)}</div>
                    <p className="text-xs text-slate-500 mt-1">
                        Faturas em aberto
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        Em Atraso
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatMoney(summary.overdue)}</div>
                    <p className="text-xs text-red-200 mt-1 font-medium bg-red-50 inline-block px-1 rounded">
                        {summary.overdueCount} faturas vencidas
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
