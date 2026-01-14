"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { InvoiceList } from "@/components/financial/invoice-list";
import { Button } from "@/components/ui/button";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { Download, CreditCard, AlertCircle, Loader2, X, Search, BarChart3 } from "lucide-react";
import { StripeConnectButton } from "@/components/financial/stripe-connect-button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getFinancialReportData } from "@/lib/reports/actions-financial";
import { FinancialReportData, ReportFilters } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { FinancialRevenueChart } from "@/components/reports/financial-revenue-chart";
import { FinancialStatusChart } from "@/components/reports/financial-status-chart";
import { FinancialTrends } from "@/components/reports/financial-trends";
import { FinancialSummary } from "@/components/reports/financial-summary";

type StatusFilter = "all" | "pending" | "paid" | "overdue" | "cancelled";
type PeriodFilter = "all" | "month" | "quarter" | "year";

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
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
    const [showReports, setShowReports] = useState(false);
    const [reportData, setReportData] = useState<FinancialReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "month" });

    useEffect(() => {
        fetchData();
    }, [statusFilter, periodFilter]);

    useEffect(() => {
        if (showReports) {
            loadReportData();
        }
    }, [showReports, reportFilters]);

    async function fetchData() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: professional } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) return;

        // Build invoice query
        let invoiceQuery = supabase
            .from("invoices")
            .select(`
                id,
                invoice_number,
                amount_cents,
                status,
                due_date,
                issue_date,
                paid_at,
                description,
                patient:patients ( full_name )
            `)
            .eq("professional_id", professional.id)
            .order("due_date", { ascending: false })
            .limit(50);

        // Apply status filter
        if (statusFilter !== "all") {
            if (statusFilter === "overdue") {
                // Overdue = pending + due_date < today
                const today = format(new Date(), "yyyy-MM-dd");
                invoiceQuery = invoiceQuery
                    .eq("status", "pending")
                    .lt("due_date", today);
            } else {
                invoiceQuery = invoiceQuery.eq("status", statusFilter);
            }
        }

        // Apply period filter
        const now = new Date();
        if (periodFilter === "month") {
            invoiceQuery = invoiceQuery
                .gte("issue_date", format(startOfMonth(now), "yyyy-MM-dd"))
                .lte("issue_date", format(endOfMonth(now), "yyyy-MM-dd"));
        } else if (periodFilter === "quarter") {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
            invoiceQuery = invoiceQuery
                .gte("issue_date", format(quarterStart, "yyyy-MM-dd"))
                .lte("issue_date", format(quarterEnd, "yyyy-MM-dd"));
        } else if (periodFilter === "year") {
            invoiceQuery = invoiceQuery
                .gte("issue_date", `${now.getFullYear()}-01-01`)
                .lte("issue_date", `${now.getFullYear()}-12-31`);
        }

        const { data: invoiceData } = await invoiceQuery;

        // Calculate summary
        const start = startOfMonth(now).toISOString();
        const end = endOfMonth(now).toISOString();
        const today = format(now, "yyyy-MM-dd");

        const [paidResult, pendingResult, overdueResult] = await Promise.all([
            supabase
                .from("invoices")
                .select("amount_cents")
                .eq("professional_id", professional.id)
                .eq("status", "paid")
                .gte("paid_at", start)
                .lte("paid_at", end),
            supabase
                .from("invoices")
                .select("amount_cents")
                .eq("professional_id", professional.id)
                .eq("status", "pending"),
            supabase
                .from("invoices")
                .select("amount_cents")
                .eq("professional_id", professional.id)
                .eq("status", "pending")
                .lt("due_date", today),
        ]);

        const revenue = paidResult.data?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;
        const pending = pendingResult.data?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;
        const overdue = overdueResult.data?.reduce((acc, curr) => acc + curr.amount_cents, 0) || 0;

        setSummary({
            revenue: revenue / 100,
            pending: pending / 100,
            overdue: overdue / 100,
            overdueCount: overdueResult.data?.length || 0,
        });

        setInvoices(invoiceData as unknown as Invoice[] || []);
        setLoading(false);
    }

    // Filter invoices based on search query
    const filteredInvoices = invoices.filter(invoice => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const patientName = invoice.patient?.full_name?.toLowerCase() || "";
        const invoiceNumber = invoice.invoice_number?.toLowerCase() || "";
        return patientName.includes(query) || invoiceNumber.includes(query);
    });

    const clearFilters = () => {
        setStatusFilter("all");
        setPeriodFilter("all");
        setSearchQuery("");
    };

    const activeFiltersCount = [
        statusFilter !== "all",
        periodFilter !== "all",
    ].filter(Boolean).length;

    const hasActiveFilters = activeFiltersCount > 0 || searchQuery !== "";

    const getFilterLabel = (type: string, value: string): string => {
        const labels: Record<string, Record<string, string>> = {
            status: {
                pending: "Pendente",
                paid: "Pago",
                overdue: "Vencido",
                cancelled: "Cancelado",
            },
            period: {
                month: "Este Mês",
                quarter: "Este Trimestre",
                year: "Este Ano",
            },
        };
        return labels[type]?.[value] || value;
    };

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
                    <Button
                        variant="outline"
                        onClick={() => setShowReports(!showReports)}
                        className="flex items-center gap-2"
                    >
                        <BarChart3 size={18} />
                        <span className="hidden sm:inline">{showReports ? "Ocultar" : "Ver"} Relatórios</span>
                    </Button>
                    <NewInvoiceDialog />
                </div>
            </div>

            {!showReports && <FinancialSummaryCards summary={summary} />}

            {showReports && (
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Relatórios Financeiros</h2>
                            <p className="text-slate-500 text-sm">Análise detalhada de receitas, faturas e pagamentos</p>
                        </div>
                        {reportData && <ExportButton reportType="financial" filters={reportFilters} disabled={reportLoading} />}
                    </div>

                    <ReportFiltersComponent
                        filters={reportFilters}
                        onFiltersChange={setReportFilters}
                    />

                    {reportLoading && !reportData ? (
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                        </div>
                    ) : reportData ? (
                        <>
                            <FinancialSummary data={reportData} />

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

                            <ChartContainer
                                title="Tendências e Comparações"
                                description="Comparação com período anterior"
                            >
                                <FinancialTrends trends={reportData.trends} />
                            </ChartContainer>
                        </>
                    ) : null}
                </div>
            )}

            {!showReports && (
                <>

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
                    {/* Status Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                                Status
                                {statusFilter !== "all" && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="pending">Pendente</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="paid">Pago</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="overdue">Vencido</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Period Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                                Período
                                {periodFilter !== "all" && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuRadioGroup value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
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
                            Status: {getFilterLabel("status", statusFilter)}
                            <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                    {periodFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                            Período: {getFilterLabel("period", periodFilter)}
                            <button onClick={() => setPeriodFilter("all")} className="ml-1 hover:text-red-500">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoices List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">
                            Faturas {filteredInvoices.length > 0 && `(${filteredInvoices.length})`}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <InvoiceList invoices={filteredInvoices} />
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
                </>
            )}
        </div>
    );
}
