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

    const cards = [
        {
            name: "Receita (Este Mês)",
            value: formatMoney(summary.revenue),
            description: "Valor efetivamente recebido",
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            name: "A Receber (Pendente)",
            value: formatMoney(summary.pending),
            description: "Faturas em aberto",
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            name: "Em Atraso",
            value: formatMoney(summary.overdue),
            description: `${summary.overdueCount} faturas vencidas`,
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-100",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((item) => (
                <div key={item.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{item.name}</p>
                        <h3 className="text-2xl font-bold text-slate-900">{item.value}</h3>
                        <p className={`text-xs font-medium mt-1 ${item.color === 'text-red-600' ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded inline-block' : 'text-slate-400'}`}>
                            {item.description}
                        </p>
                    </div>
                    <div className={`p-4 rounded-xl ${item.bg}`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}
