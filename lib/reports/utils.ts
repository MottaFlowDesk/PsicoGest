import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachQuarterOfInterval, eachYearOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PeriodFilter, ReportFilters } from "./types";

/**
 * Obter intervalo de datas baseado no filtro de período
 */
export function getPeriodRange(period: PeriodFilter, startDate?: Date, endDate?: Date): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case "week":
      return {
        start: startOfWeek(now, { locale: ptBR }),
        end: endOfWeek(now, { locale: ptBR }),
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case "quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case "year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        };
      }
      // Fallback to month if custom dates not provided
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

/**
 * Obter intervalo de período anterior para comparação
 */
export function getPreviousPeriodRange(period: PeriodFilter, currentStart: Date, currentEnd: Date): { start: Date; end: Date } {
  const duration = currentEnd.getTime() - currentStart.getTime();
  
  return {
    start: new Date(currentStart.getTime() - duration),
    end: new Date(currentStart.getTime() - 1),
  };
}

/**
 * Gerar array de períodos para gráficos
 */
export function generatePeriodLabels(start: Date, end: Date, period: PeriodFilter): string[] {
  switch (period) {
    case "today":
      return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
    case "week":
      return eachDayOfInterval({ start, end }).map(date => format(date, "EEE", { locale: ptBR }));
    case "month":
      return eachDayOfInterval({ start, end }).map(date => format(date, "dd/MM"));
    case "quarter":
      return eachMonthOfInterval({ start, end }).map(date => format(date, "MMM", { locale: ptBR }));
    case "year":
      return eachMonthOfInterval({ start, end }).map(date => format(date, "MMM", { locale: ptBR }));
    default:
      return eachDayOfInterval({ start, end }).map(date => format(date, "dd/MM"));
  }
}

/**
 * Formatar valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formatar porcentagem
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcular variação percentual
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Formatar duração em minutos para texto legível
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Formatar data para exibição
 */
export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: ptBR });
}

/**
 * Obter cor baseada em status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: "text-green-600 bg-green-50",
    pending: "text-yellow-600 bg-yellow-50",
    overdue: "text-red-600 bg-red-50",
    cancelled: "text-gray-600 bg-gray-50",
    completed: "text-blue-600 bg-blue-50",
    scheduled: "text-purple-600 bg-purple-50",
    confirmed: "text-blue-600 bg-blue-50",
    no_show: "text-orange-600 bg-orange-50",
  };
  return colors[status] || "text-gray-600 bg-gray-50";
}

/**
 * Calcular média
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calcular mediana
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Agrupar dados por período
 */
export function groupByPeriod<T>(
  data: T[],
  getDate: (item: T) => Date,
  period: PeriodFilter
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  
  data.forEach(item => {
    const date = getDate(item);
    let key: string;
    
    switch (period) {
      case "today":
        key = format(date, "HH:00");
        break;
      case "week":
        key = format(date, "yyyy-MM-dd");
        break;
      case "month":
        key = format(date, "yyyy-MM-dd");
        break;
      case "quarter":
        key = format(date, "yyyy-MM");
        break;
      case "year":
        key = format(date, "yyyy-MM");
        break;
      default:
        key = format(date, "yyyy-MM-dd");
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });
  
  return grouped;
}

