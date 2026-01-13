"use client";

import { useState, useEffect } from "react";
import { ReportFilters } from "@/lib/reports/types";
import { getAppointmentReportData } from "./actions";
import { AppointmentReportData } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ReportHeader } from "@/components/reports/report-header";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { AppointmentsVolumeChart } from "@/components/reports/appointments-volume-chart";
import { AppointmentsStatusChart } from "@/components/reports/appointments-status-chart";
import { AppointmentsProductivity } from "@/components/reports/appointments-productivity";
import { AppointmentsNoShowAnalysis } from "@/components/reports/appointments-no-show-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/reports/utils";
import { Loader2 } from "lucide-react";

export default function AppointmentsReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: "month",
    appointmentType: "all",
    appointmentStatus: "all",
  });
  const [data, setData] = useState<AppointmentReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const reportData = await getAppointmentReportData(filters);
      setData(reportData);
    } catch (error) {
      console.error("Error loading appointment report:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Erro ao carregar dados do relatório</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <ReportHeader
          title="Relatório de Atendimentos"
          subtitle="Análise de volume, produtividade e performance"
          filters={filters}
        />
        <ExportButton reportType="appointments" filters={filters} disabled={loading} />
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAppointmentFilters={true}
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalAppointments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.summary.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalHours}h</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(data.summary.averageDuration)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Volume de Atendimentos"
              description="Distribuição de atendimentos ao longo do período"
            >
              <AppointmentsVolumeChart data={data.volume} />
            </ChartContainer>

            <ChartContainer
              title="Distribuição por Status"
              description="Proporção de atendimentos por status"
            >
              <AppointmentsStatusChart data={data.statusDistribution} />
            </ChartContainer>
          </div>

          <ChartContainer
            title="Produtividade"
            description="Sessões e horas trabalhadas"
          >
            <AppointmentsProductivity data={data.productivity} />
          </ChartContainer>

          <ChartContainer
            title="Análise de No-Show"
            description="Taxa de faltas ao longo do período"
          >
            <AppointmentsNoShowAnalysis data={data.noShowAnalysis} />
          </ChartContainer>
        </>
      )}
    </div>
  );
}

