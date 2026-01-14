"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

export default function AppointmentsPage() {
    const [reportData, setReportData] = useState<AppointmentReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "month" });

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

        </div>
    );
}
