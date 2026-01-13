"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportFilters } from "@/lib/reports/types";
import { getPeriodRange, formatDate } from "@/lib/reports/utils";

interface ReportHeaderProps {
  title: string;
  filters: ReportFilters;
  subtitle?: string;
}

export function ReportHeader({ title, filters, subtitle }: ReportHeaderProps) {
  const { start, end } = getPeriodRange(filters.period, filters.startDate, filters.endDate);
  
  const periodLabel = filters.period === "custom"
    ? `${formatDate(start)} - ${formatDate(end)}`
    : filters.period === "today"
    ? "Hoje"
    : filters.period === "week"
    ? "Esta Semana"
    : filters.period === "month"
    ? "Este Mês"
    : filters.period === "quarter"
    ? "Este Trimestre"
    : "Este Ano";

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      <p className="text-sm text-slate-400 mt-2">
        Período: <span className="font-medium">{periodLabel}</span>
        {filters.period === "custom" && (
          <span className="ml-2">
            ({format(start, "dd/MM/yyyy", { locale: ptBR })} - {format(end, "dd/MM/yyyy", { locale: ptBR })})
          </span>
        )}
      </p>
    </div>
  );
}

