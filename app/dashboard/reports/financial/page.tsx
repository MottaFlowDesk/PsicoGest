"use client";

import { useState, useEffect } from "react";
import { ReportFilters } from "@/lib/reports/types";
import { getFinancialReportData } from "./actions";
import { FinancialReportData } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ReportHeader } from "@/components/reports/report-header";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { FinancialRevenueChart } from "@/components/reports/financial-revenue-chart";
import { FinancialStatusChart } from "@/components/reports/financial-status-chart";
import { FinancialTrends } from "@/components/reports/financial-trends";
import { FinancialSummary } from "@/components/reports/financial-summary";
import { Loader2 } from "lucide-react";

export default function FinancialReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: "month",
  });
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const reportData = await getFinancialReportData(filters);
      setData(reportData);
    } catch (error) {
      console.error("Error loading financial report:", error);
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
          title="Relatório Financeiro"
          subtitle="Análise detalhada de receitas, faturas e pagamentos"
          filters={filters}
        />
        <ExportButton reportType="financial" filters={filters} disabled={loading} />
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
          <FinancialSummary data={data} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Receita ao Longo do Tempo"
              description="Evolução da receita no período selecionado"
            >
              <FinancialRevenueChart data={data.revenue} />
            </ChartContainer>

            <ChartContainer
              title="Distribuição por Status"
              description="Distribuição de faturas por status"
            >
              <FinancialStatusChart data={data.statusDistribution} />
            </ChartContainer>
          </div>

          <ChartContainer
            title="Tendências e Comparações"
            description="Comparação com período anterior"
          >
            <FinancialTrends trends={data.trends} />
          </ChartContainer>
        </>
      )}
    </div>
  );
}

