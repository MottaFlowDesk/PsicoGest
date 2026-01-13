"use client";

import { useState, useEffect } from "react";
import { ReportFilters } from "@/lib/reports/types";
import { getPerformanceReportData } from "./actions";
import { PerformanceReportData } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ReportHeader } from "@/components/reports/report-header";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { PerformanceOverview } from "@/components/reports/performance-overview";
import { KPICards } from "@/components/reports/kpi-cards";
import { Loader2 } from "lucide-react";

export default function PerformanceReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: "month",
  });
  const [data, setData] = useState<PerformanceReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const reportData = await getPerformanceReportData(filters);
      setData(reportData);
    } catch (error) {
      console.error("Error loading performance report:", error);
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
          title="Relatório de Performance"
          subtitle="Visão consolidada de todas as métricas do negócio"
          filters={filters}
        />
        <ExportButton reportType="performance" filters={filters} disabled={loading} />
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          <KPICards data={data} />

          <ChartContainer
            title="Visão Geral de Performance"
            description="Evolução de receita, atendimentos e pacientes"
          >
            <PerformanceOverview trends={data.trends} />
          </ChartContainer>
        </>
      )}
    </div>
  );
}

