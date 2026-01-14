"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Clock,
    Video,
    MapPin,
    Search,
    Filter,
    CheckCircle,
    Loader2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppointmentActionsMenu } from "@/components/appointments/appointment-actions-menu";
import { EditAppointmentDialog } from "@/components/appointments/edit-appointment-dialog";
import { TelehealthEnterButton } from "@/components/appointments/telehealth-enter-button";
import { confirmAppointment } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getAppointmentReportData } from "@/lib/reports/actions-appointments";
import { AppointmentReportData, ReportFilters } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { AppointmentsVolumeChart } from "@/components/reports/appointments-volume-chart";
import { AppointmentsStatusChart } from "@/components/reports/appointments-status-chart";
import { AppointmentsProductivity } from "@/components/reports/appointments-productivity";
import { AppointmentsNoShowAnalysis } from "@/components/reports/appointments-no-show-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/reports/utils";

type StatusFilter = "all" | "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
type TypeFilter = "all" | "in_person" | "telehealth";
type PeriodFilter = "all" | "today" | "week" | "month";

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
    const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const router = useRouter();
    const [reportData, setReportData] = useState<AppointmentReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "month" });

    useEffect(() => {
        fetchAppointments();
        loadReportData();
    }, [statusFilter, typeFilter, periodFilter]);

    useEffect(() => {
        loadReportData();
    }, [reportFilters]);

    async function fetchAppointments() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        let query = supabase
            .from("appointments")
            .select(`
                *,
                patients (
                    id,
                    full_name,
                    phone,
                    email
                )
            `)
            .order('scheduled_at', { ascending: true })
            .limit(100);

        // Apply status filter
        if (statusFilter !== "all") {
            query = query.eq("status", statusFilter);
        }

        // Apply type filter
        if (typeFilter !== "all") {
            query = query.eq("type", typeFilter);
        }

        // Apply period filter
        const now = new Date();
        if (periodFilter === "today") {
            query = query
                .gte("scheduled_at", startOfDay(now).toISOString())
                .lte("scheduled_at", endOfDay(now).toISOString());
        } else if (periodFilter === "week") {
            query = query
                .gte("scheduled_at", startOfWeek(now, { weekStartsOn: 0 }).toISOString())
                .lte("scheduled_at", endOfWeek(now, { weekStartsOn: 0 }).toISOString());
        } else if (periodFilter === "month") {
            query = query
                .gte("scheduled_at", startOfMonth(now).toISOString())
                .lte("scheduled_at", endOfMonth(now).toISOString());
        }

        const { data } = await query;

        setAppointments(data || []);
        setLoading(false);
    }

    const handleQuickConfirm = async (appointmentId: string) => {
        setConfirmingId(appointmentId);
        try {
            await confirmAppointment(appointmentId);
            toast.success("Agendamento confirmado!");
            router.refresh();
            fetchAppointments();
        } catch (error) {
            toast.error("Erro ao confirmar agendamento");
        } finally {
            setConfirmingId(null);
        }
    };

    // Filter appointments based on search query
    const filteredAppointments = appointments.filter(apt => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const patientName = apt.patients?.full_name?.toLowerCase() || "";

        return patientName.includes(query);
    });

    const clearFilters = () => {
        setStatusFilter("all");
        setTypeFilter("all");
        setPeriodFilter("all");
        setSearchQuery("");
    };

    const activeFiltersCount = [
        statusFilter !== "all",
        typeFilter !== "all",
        periodFilter !== "all",
    ].filter(Boolean).length;

    const hasActiveFilters = activeFiltersCount > 0 || searchQuery !== "";

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: "bg-blue-50 text-blue-700 border-blue-100",
            confirmed: "bg-green-50 text-green-700 border-green-100",
            completed: "bg-slate-50 text-slate-700 border-slate-200",
            cancelled: "bg-red-50 text-red-700 border-red-100",
            no_show: "bg-orange-50 text-orange-700 border-orange-100",
        };

        const labels: Record<string, string> = {
            scheduled: "Agendado",
            confirmed: "Confirmado",
            completed: "Concluído",
            cancelled: "Cancelado",
            no_show: "Não Compareceu",
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.scheduled}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getFilterLabel = (type: string, value: string): string => {
        const labels: Record<string, Record<string, string>> = {
            status: {
                scheduled: "Agendado",
                confirmed: "Confirmado",
                completed: "Concluído",
                cancelled: "Cancelado",
                no_show: "Não Compareceu",
            },
            type: {
                in_person: "Presencial",
                telehealth: "Online",
            },
            period: {
                today: "Hoje",
                week: "Esta Semana",
                month: "Este Mês",
            },
        };
        return labels[type]?.[value] || value;
    };

    async function loadReportData() {
        setReportLoading(true);
        try {
            const data = await getAppointmentReportData(reportFilters);
            setReportData(data);
        } catch (error) {
            console.error("Error loading appointment report:", error);
        } finally {
            setReportLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Atendimentos</h1>
                    <p className="text-slate-500 text-sm">Gerencie seus agendamentos e sessões</p>
                </div>
                {reportData && <ExportButton reportType="appointments" filters={reportFilters} disabled={reportLoading} />}
            </div>

            {/* Relatórios e Gráficos */}
            <div className="space-y-4">
                <ReportFiltersComponent
                    filters={reportFilters}
                    onFiltersChange={setReportFilters}
                    showAppointmentFilters={true}
                />

                {reportLoading && !reportData ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    </div>
                ) : reportData ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.summary.totalAppointments}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{reportData.summary.completed}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.summary.totalHours}h</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatDuration(reportData.summary.averageDuration)}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartContainer
                                title="Volume de Atendimentos"
                                description="Distribuição de atendimentos ao longo do período"
                            >
                                <AppointmentsVolumeChart data={reportData.volume} />
                            </ChartContainer>

                            <ChartContainer
                                title="Distribuição por Status"
                                description="Proporção de atendimentos por status"
                            >
                                <AppointmentsStatusChart data={reportData.statusDistribution} />
                            </ChartContainer>
                        </div>

                        <ChartContainer
                            title="Produtividade"
                            description="Sessões e horas trabalhadas"
                        >
                            <AppointmentsProductivity data={reportData.productivity} />
                        </ChartContainer>

                        <ChartContainer
                            title="Análise de No-Show"
                            description="Taxa de faltas ao longo do período"
                        >
                            <AppointmentsNoShowAnalysis data={reportData.noShowAnalysis} />
                        </ChartContainer>
                    </>
                ) : null}
            </div>

            <>
            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar por paciente..."
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
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="scheduled">Agendado</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="confirmed">Confirmado</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="completed">Concluído</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="no_show">Não Compareceu</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Type Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                                Tipo
                                {typeFilter !== "all" && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuRadioGroup value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="in_person">Presencial</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="telehealth">Online</DropdownMenuRadioItem>
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
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuRadioGroup value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioItem value="today">Hoje</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="week">Esta Semana</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="month">Este Mês</DropdownMenuRadioItem>
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
                    {typeFilter !== "all" && (
                        <Badge variant="secondary" className="gap-1">
                            Tipo: {getFilterLabel("type", typeFilter)}
                            <button onClick={() => setTypeFilter("all")} className="ml-1 hover:text-red-500">
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
                        <p className="text-slate-500">Carregando agendamentos...</p>
                    </div>
                ) : !filteredAppointments || filteredAppointments.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            {hasActiveFilters ? "Nenhum agendamento encontrado" : "Agenda vazia"}
                        </h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            {hasActiveFilters
                                ? "Tente ajustar os filtros ou busca."
                                : "Nenhum agendamento encontrado."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data / Hora</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paciente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredAppointments.map((apt: any) => {
                                    const date = new Date(apt.scheduled_at);
                                    const isPast = date < new Date();
                                    const canConfirm = apt.status === "scheduled" && !isPast;

                                    return (
                                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900 capitalize">
                                                        {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                                    </span>
                                                    <span className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={14} />
                                                        {format(date, "HH:mm")} ({apt.duration_minutes} min)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xs mr-3">
                                                        {apt.patients?.full_name?.substring(0, 2).toUpperCase() || "UN"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {apt.patients?.full_name || "Desconhecido"}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Particular
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    {apt.type === 'telehealth' ? (
                                                        <><Video size={16} className="text-blue-500" /> Online</>
                                                    ) : (
                                                        <><MapPin size={16} className="text-slate-400" /> Presencial</>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(apt.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {apt.type === 'telehealth' && (
                                                        <TelehealthEnterButton
                                                            meetingLink={apt.meeting_link}
                                                            scheduledAt={apt.scheduled_at}
                                                            status={apt.status}
                                                        />
                                                    )}
                                                    {canConfirm && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50"
                                                            onClick={() => handleQuickConfirm(apt.id)}
                                                            disabled={confirmingId === apt.id}
                                                            title="Confirmar Presença"
                                                        >
                                                            {confirmingId === apt.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    <AppointmentActionsMenu
                                                        appointmentId={apt.id}
                                                        currentStatus={apt.status}
                                                        patientName={apt.patients?.full_name || "Paciente"}
                                                        onEdit={() => setEditingAppointment(apt)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {editingAppointment && (
                <EditAppointmentDialog
                    appointment={editingAppointment}
                    open={!!editingAppointment}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingAppointment(null);
                            fetchAppointments();
                        }
                    }}
                />
            )}
            </>
        </div>
    );
}
