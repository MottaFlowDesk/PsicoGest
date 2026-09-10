"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { InvoiceList } from "@/components/financial/invoice-list";
import { Button } from "@/components/ui/button";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle, Loader2, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StripeConnectButton } from "@/components/financial/stripe-connect-button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { getFinancialReportData } from "@/lib/reports/actions-financial";
import { FinancialReportData, ReportFilters, PeriodFilter as ReportPeriodFilter } from "@/lib/reports/types";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { FinancialRevenueChart } from "@/components/reports/financial-revenue-chart";
import { FinancialStatusChart } from "@/components/reports/financial-status-chart";
import { FinancialTrends } from "@/components/reports/financial-trends";
import { FinancialSummary } from "@/components/reports/financial-summary";

type StatusFilter = "all" | "pending" | "paid" | "overdue" | "cancelled";
type PeriodFilter = "all" | "month" | "quarter" | "year";

const PAGE_SIZE = 10;

const STATUS_TABS: { value: StatusFilter; label: string; active: string; dot: string }[] = [
    { value: "all", label: "Todas", active: "bg-slate-900 text-white", dot: "bg-slate-400" },
    { value: "pending", label: "Pendentes", active: "bg-blue-600 text-white", dot: "bg-blue-600" },
    { value: "paid", label: "Pagas", active: "bg-green-600 text-white", dot: "bg-green-600" },
    { value: "overdue", label: "Vencidas", active: "bg-orange-500 text-white", dot: "bg-orange-500" },
    { value: "cancelled", label: "Canceladas", active: "bg-red-600 text-white", dot: "bg-red-600" },
];

function paginationItems(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const items: (number | "ellipsis")[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) items.push("ellipsis");
    for (let page = start; page <= end; page++) items.push(page);
    if (end < total - 1) items.push("ellipsis");
    items.push(total);

    return items;
}

// Builder do supabase-js; tipar com precisão aqui exigiria os genéricos do PostgREST
type InvoiceQuery = any;

/**
 * "Vencida" não é só o status gravado: uma fatura pendente com vencimento
 * no passado também conta. Os dois casos precisam ser resolvidos no banco,
 * senão a paginação devolveria páginas incompletas.
 */
function applyStatusFilter(query: InvoiceQuery, status: StatusFilter, today: string): InvoiceQuery {
    if (status === "paid") return query.eq("status", "paid");
    if (status === "cancelled") return query.eq("status", "cancelled");
    if (status === "pending") return query.eq("status", "pending").gte("due_date", today);
    if (status === "overdue") {
        return query.or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`);
    }
    return query;
}

function applySearchFilter(query: InvoiceQuery, search: string, patientIds: string[]): InvoiceQuery {
    if (!search) return query;

    // Vírgula e parênteses são separadores na sintaxe de or() do PostgREST
    const termo = search.replace(/[,()]/g, " ").trim();
    if (!termo) return query;

    const condicoes = [`invoice_number.ilike.%${termo}%`];
    if (patientIds.length > 0) condicoes.push(`patient_id.in.(${patientIds.join(",")})`);

    return query.or(condicoes.join(","));
}

interface Invoice {
    id: string;
    invoice_number: string;
    amount_cents: number;
    status: "pending" | "paid" | "overdue" | "cancelled";
    due_date: string;
    issue_date: string;
    paid_at: string | null;
    description?: string | null;
    patient: {
        full_name: string;
    };
}

interface Summary {
    revenue: number;
    pending: number;
    overdue: number;
    overdueCount: number;
}

export default function FinancialPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [summary, setSummary] = useState<Summary>({ revenue: 0, pending: 0, overdue: 0, overdueCount: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("year");
    const [page, setPage] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<StatusFilter, number>>({
        all: 0, pending: 0, paid: 0, overdue: 0, cancelled: 0,
    });
    const [reportData, setReportData] = useState<FinancialReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "year" });

    useEffect(() => {
        // Mantém cards/gráficos alinhados ao filtro de período da tela
        const reportPeriod: ReportPeriodFilter =
            periodFilter === "all" ? "year" : periodFilter;
        setReportFilters((prev) =>
            prev.period === reportPeriod ? prev : { ...prev, period: reportPeriod }
        );
        fetchData();
    }, [statusFilter, periodFilter, debouncedSearch, page]);

    useEffect(() => {
        loadReportData();
    }, [reportFilters]);

    // Busca agora vai ao banco, então espera o usuário parar de digitar
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    function getPeriodBounds(period: PeriodFilter, now = new Date()) {
        if (period === "month") {
            return {
                start: format(startOfMonth(now), "yyyy-MM-dd"),
                end: format(endOfMonth(now), "yyyy-MM-dd"),
            };
        }
        if (period === "quarter") {
            return {
                start: format(startOfQuarter(now), "yyyy-MM-dd"),
                end: format(endOfQuarter(now), "yyyy-MM-dd"),
            };
        }
        if (period === "year") {
            return {
                start: format(startOfYear(now), "yyyy-MM-dd"),
                end: format(endOfYear(now), "yyyy-MM-dd"),
            };
        }
        return null;
    }

    async function fetchData() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            setLoading(false);
            return;
        }

        const now = new Date();
        const today = format(now, "yyyy-MM-dd");
        const periodBounds = getPeriodBounds(periodFilter, now);

        // Busca por nome de paciente exige resolver os ids antes: o or() do
        // PostgREST não combina coluna própria com coluna de tabela relacionada
        let patientIds: string[] = [];
        if (debouncedSearch) {
            const { data: matched } = await supabase
                .from("patients")
                .select("id")
                .eq("professional_id", professional.id)
                .ilike("full_name", `%${debouncedSearch}%`)
                .limit(200);
            patientIds = (matched || []).map((p) => p.id);
        }

        const applyPeriod = (query: InvoiceQuery): InvoiceQuery =>
            periodBounds
                ? query.gte("issue_date", periodBounds.start).lte("issue_date", periodBounds.end)
                : query;

        const baseQuery = (select: string, options?: { count: "exact"; head?: boolean }) => {
            let q = supabase
                .from("invoices")
                .select(select, options)
                .eq("professional_id", professional.id);
            q = applyPeriod(q);
            return applySearchFilter(q, debouncedSearch, patientIds);
        };

        // Contadores das abas: uma contagem por status, sem trazer as linhas
        const countPromises = STATUS_TABS.map((tab) =>
            applyStatusFilter(baseQuery("id", { count: "exact", head: true }), tab.value, today)
        );

        const from = (page - 1) * PAGE_SIZE;
        const listQuery = applyStatusFilter(
            baseQuery(
                `
                id,
                invoice_number,
                amount_cents,
                status,
                due_date,
                issue_date,
                paid_at,
                description,
                payment_method,
                notes,
                patient:patients ( full_name )
            `,
                { count: "exact" }
            ),
            statusFilter,
            today
        )
            .order("due_date", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        const [listResult, ...countResults] = await Promise.all([listQuery, ...countPromises]);

        const novosContadores = { all: 0, pending: 0, paid: 0, overdue: 0, cancelled: 0 };
        STATUS_TABS.forEach((tab, i) => {
            novosContadores[tab.value] = countResults[i]?.count ?? 0;
        });
        setStatusCounts(novosContadores);
        setTotalInvoices(listResult.count ?? 0);

        const isOverdueRow = (inv: { status: string; due_date: string | null }) =>
            inv.status === "overdue" ||
            (inv.status === "pending" && !!inv.due_date && inv.due_date < today);

        const pageInvoices = (listResult.data as unknown as Invoice[]) || [];

        // Summary cards laterais / pendências — respeitam o período selecionado
        let summaryQuery = supabase
            .from("invoices")
            .select("amount_cents, status, due_date, paid_at, issue_date")
            .eq("professional_id", professional.id);

        if (periodBounds) {
            summaryQuery = summaryQuery
                .gte("issue_date", periodBounds.start)
                .lte("issue_date", periodBounds.end);
        }

        const { data: summaryInvoices } = await summaryQuery.limit(2000);

        const rows = summaryInvoices || [];
        const isOverdue = isOverdueRow;

        const revenue =
            rows
                .filter((inv) => inv.status === "paid")
                .reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;
        const pending =
            rows
                .filter((inv) => inv.status === "pending" && !isOverdue(inv))
                .reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;
        const overdueRows = rows.filter((inv) => isOverdue(inv));
        const overdue = overdueRows.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;

        setSummary({
            revenue: revenue / 100,
            pending: pending / 100,
            overdue: overdue / 100,
            overdueCount: overdueRows.length,
        });

        setInvoices(pageInvoices);
        setLoading(false);
    }

    async function loadReportData() {
        setReportLoading(true);
        try {
            const data = await getFinancialReportData(reportFilters);
            setReportData(data);
        } catch (error) {
            console.error("Error loading financial report:", error);
        } finally {
            setReportLoading(false);
        }
    }

    const totalPages = Math.max(1, Math.ceil(totalInvoices / PAGE_SIZE));
    const primeiroDaPagina = totalInvoices === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const ultimoDaPagina = Math.min(page * PAGE_SIZE, totalInvoices);

    const changeStatus = (value: StatusFilter) => {
        setStatusFilter(value);
        setPage(1);
    };

    const changePeriod = (value: PeriodFilter) => {
        setPeriodFilter(value);
        setPage(1);
    };

    const clearFilters = () => {
        setStatusFilter("all");
        setPeriodFilter("all");
        setSearchQuery("");
        setPage(1);
    };

    const hasActiveFilters = (statusFilter !== "all" || periodFilter !== "all") || searchQuery !== "";

    const getFilterLabel = (type: string, value: string): string => {
        const labels: Record<string, Record<string, string>> = {
            period: {
                month: "Este Mês",
                quarter: "Este Trimestre",
                year: "Este Ano",
            },
        };
        return labels[type]?.[value] || value;
    };

    if (loading && invoices.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
                    <p className="text-slate-500 text-sm">Gerencie suas faturas e receitas</p>
                </div>
                <div className="flex gap-3">
                    {reportData && <ExportButton reportType="financial" filters={reportFilters} disabled={reportLoading} />}
                    <NewInvoiceDialog onSuccess={fetchData} />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar por paciente ou número..."
                        className="pl-10 border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                                Status
                                {statusFilter !== "all" && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => changeStatus(v as StatusFilter)}>
                                {STATUS_TABS.map((tab) => (
                                    <DropdownMenuRadioItem key={tab.value} value={tab.value}>
                                        <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", tab.dot)} />
                                        {tab.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                                Período
                                {periodFilter !== "all" && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuRadioGroup value={periodFilter} onValueChange={(v) => changePeriod(v as PeriodFilter)}>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="month">Este Mês</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="quarter">Este Trimestre</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="year">Este Ano</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearFilters}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <X size={16} className="mr-1" />
                            Limpar
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                    {statusFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                            Status: {STATUS_TABS.find((tab) => tab.value === statusFilter)?.label}
                            <button onClick={() => changeStatus("all")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                    {periodFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                            Período: {getFilterLabel("period", periodFilter)}
                            <button onClick={() => changePeriod("all")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                    {searchQuery && (
                        <Badge variant="secondary" className="gap-1">
                            Busca: {searchQuery}
                            <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            {/* Relatórios e Gráficos */}
            <div className="space-y-6">
                {reportLoading && !reportData ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    </div>
                ) : reportData ? (
                    <>
                        <FinancialSummary data={reportData} />

                        <ChartContainer
                            title="Tendências e Comparações"
                            description="Comparação com período anterior"
                        >
                            <FinancialTrends trends={reportData.trends} />
                        </ChartContainer>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartContainer
                                title="Receita ao Longo do Tempo"
                                description="Evolução da receita no período selecionado"
                            >
                                <FinancialRevenueChart data={reportData.revenue} />
                            </ChartContainer>

                            <ChartContainer
                                title="Distribuição por Status"
                                description="Distribuição de faturas por status"
                            >
                                <FinancialStatusChart data={reportData.statusDistribution} />
                            </ChartContainer>
                        </div>
                    </>
                ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoices List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 pt-6 pb-3 flex justify-between items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Faturas {totalInvoices > 0 && `(${totalInvoices})`}
                        </h2>
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    </div>

                    <div className="flex flex-wrap gap-1.5 px-6 pb-3 border-b border-slate-100">
                        {STATUS_TABS.map((tab) => {
                            const ativa = statusFilter === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => changeStatus(tab.value)}
                                    aria-pressed={ativa}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        ativa
                                            ? tab.active
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {!ativa && <span className={cn("h-2 w-2 rounded-full", tab.dot)} />}
                                    {tab.label}
                                    <span
                                        className={cn(
                                            "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                                            ativa ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                        )}
                                    >
                                        {statusCounts[tab.value]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="overflow-x-auto">
                        <InvoiceList invoices={invoices} onUpdate={fetchData} />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                        <p className="text-sm text-slate-500">
                            {totalInvoices === 0
                                ? "Nenhuma fatura"
                                : `Mostrando ${primeiroDaPagina}–${ultimoDaPagina} de ${totalInvoices}`}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline ml-1">Anterior</span>
                            </Button>
                            {paginationItems(page, totalPages).map((item, index) =>
                                item === "ellipsis" ? (
                                    <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                                        …
                                    </span>
                                ) : (
                                    <Button
                                        key={item}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0",
                                            item === page &&
                                                "border-brand-600 bg-brand-600 text-white hover:bg-brand-700 hover:text-white"
                                        )}
                                        onClick={() => setPage(item)}
                                        disabled={loading}
                                    >
                                        {item}
                                    </Button>
                                )
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                            >
                                <span className="hidden sm:inline mr-1">Próxima</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
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
                                        <p className="text-xs text-slate-500">Receba pagamentos online</p>
                                    </div>
                                </div>
                                <StripeConnectButton />
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
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                                    <span>
                                        Você tem{" "}
                                        <button
                                            type="button"
                                            onClick={() => changeStatus("overdue")}
                                            className="font-semibold text-orange-600 hover:underline"
                                        >
                                            {summary.overdueCount} faturas vencidas
                                        </button>
                                        .
                                    </span>
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
