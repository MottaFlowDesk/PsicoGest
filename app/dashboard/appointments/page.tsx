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
