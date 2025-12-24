"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { InvoiceList } from "@/components/financial/invoice-list";
import { Button } from "@/components/ui/button";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { Download, CreditCard, AlertCircle, Loader2, X, Search } from "lucide-react";
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

    useEffect(() => {
        fetchData();
    }, [statusFilter, periodFilter]);

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

    if (loading && invoices.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar Relatório</span>
                    </button>
                    <NewInvoiceDialog />
                </div>
            </div>

            <FinancialSummaryCards summary={summary} />

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
        </div>
    );
}
