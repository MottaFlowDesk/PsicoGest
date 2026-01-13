"use server";

import { createClient } from "@/lib/supabase/server";
import { FinancialReportData, ReportFilters } from "@/lib/reports/types";
import { getPeriodRange, getPreviousPeriodRange, groupByPeriod, PeriodFilter } from "@/lib/reports/utils";
import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getFinancialReportData(filters: ReportFilters): Promise<FinancialReportData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: professional } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!professional) {
    throw new Error("Professional not found");
  }

  const { start, end } = getPeriodRange(filters.period, filters.startDate, filters.endDate);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(filters.period, start, end);

  // Fetch all invoices in the period
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id,
      amount_cents,
      status,
      issue_date,
      due_date,
      paid_at,
      patient_id,
      patients!inner(full_name)
    `)
    .eq("professional_id", professional.id)
    .gte("issue_date", start.toISOString().split("T")[0])
    .lte("issue_date", end.toISOString().split("T")[0])
    .order("issue_date", { ascending: true });

  if (error) {
    console.error("Error fetching invoices:", error);
    throw new Error("Failed to fetch financial data");
  }

  // Fetch previous period invoices for comparison
  const { data: prevInvoices } = await supabase
    .from("invoices")
    .select("amount_cents, status, paid_at")
    .eq("professional_id", professional.id)
    .gte("issue_date", prevStart.toISOString().split("T")[0])
    .lte("issue_date", prevEnd.toISOString().split("T")[0]);

  // Process revenue by period
  const revenue = generateRevenueData(invoices || [], filters.period, start, end);

  // Status distribution
  const statusDistribution = calculateStatusDistribution(invoices || []);

  // Trends (comparison with previous period)
  const trends = calculateTrends(invoices || [], prevInvoices || [], filters.period, start, end, prevStart, prevEnd);

  // Top patients
  const topPatients = calculateTopPatients(invoices || []);

  // Conversion rate
  const conversionRate = calculateConversionRate(invoices || []);

  // Average payment time
  const averagePaymentTime = calculateAveragePaymentTime(invoices || []);

  // Summary
  const summary = calculateSummary(invoices || []);

  return {
    revenue,
    statusDistribution,
    trends,
    topPatients,
    conversionRate,
    averagePaymentTime,
    summary,
  };
}

function generateRevenueData(
  invoices: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; amount: number }[] {
  const paidInvoices = invoices.filter(inv => inv.status === "paid" && inv.paid_at);
  const grouped = groupByPeriod(paidInvoices, (inv) => new Date(inv.paid_at), period);

  let periods: Date[];
  switch (period) {
    case "today":
      periods = Array.from({ length: 24 }, (_, i) => {
        const date = new Date(start);
        date.setHours(i, 0, 0, 0);
        return date;
      });
      break;
    case "week":
      periods = eachDayOfInterval({ start, end });
      break;
    case "month":
      periods = eachDayOfInterval({ start, end });
      break;
    case "quarter":
    case "year":
      periods = eachMonthOfInterval({ start, end });
      break;
    default:
      periods = eachDayOfInterval({ start, end });
  }

  return periods.map(periodDate => {
    const key = format(periodDate, period === "today" ? "HH:00" : period === "quarter" || period === "year" ? "yyyy-MM" : "yyyy-MM-dd");
    const periodInvoices = grouped.get(key) || [];
    const amount = periodInvoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
    
    return {
      period: format(periodDate, period === "today" ? "HH:mm" : period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: ptBR }),
      amount,
    };
  });
}

function calculateStatusDistribution(invoices: any[]): { status: string; count: number; amount: number }[] {
  const statuses = ["paid", "pending", "overdue", "cancelled"];
  const distribution: Record<string, { count: number; amount: number }> = {};

  statuses.forEach(status => {
    distribution[status] = { count: 0, amount: 0 };
  });

  invoices.forEach(inv => {
    let status = inv.status;
    if (status === "pending" && inv.due_date && new Date(inv.due_date) < new Date()) {
      status = "overdue";
    }

    if (!distribution[status]) {
      distribution[status] = { count: 0, amount: 0 };
    }
    distribution[status].count++;
    distribution[status].amount += (inv.amount_cents || 0) / 100;
  });

  return Object.entries(distribution).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
  }));
}

function calculateTrends(
  currentInvoices: any[],
  previousInvoices: any[],
  period: PeriodFilter,
  currentStart: Date,
  currentEnd: Date,
  prevStart: Date,
  prevEnd: Date
): { period: string; current: number; previous: number; change: number }[] {
  const currentPaid = currentInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
  const previousPaid = previousInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
  const change = previousPaid > 0 ? ((currentPaid - previousPaid) / previousPaid) * 100 : 0;

  return [{
    period: "Receita",
    current: currentPaid,
    previous: previousPaid,
    change,
  }];
}

function calculateTopPatients(invoices: any[]): { patientId: string; patientName: string; totalRevenue: number; invoiceCount: number }[] {
  const patientMap = new Map<string, { name: string; revenue: number; count: number }>();

  invoices
    .filter(inv => inv.status === "paid")
    .forEach(inv => {
      const patientId = inv.patient_id;
      if (!patientId) return;

      const patient = inv.patients;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          name: patient?.full_name || "Desconhecido",
          revenue: 0,
          count: 0,
        });
      }

      const data = patientMap.get(patientId)!;
      data.revenue += (inv.amount_cents || 0) / 100;
      data.count++;
    });

  return Array.from(patientMap.entries())
    .map(([patientId, data]) => ({
      patientId,
      patientName: data.name,
      totalRevenue: data.revenue,
      invoiceCount: data.count,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

function calculateConversionRate(invoices: any[]): { issued: number; paid: number; rate: number } {
  const issued = invoices.length;
  const paid = invoices.filter(inv => inv.status === "paid").length;
  const rate = issued > 0 ? (paid / issued) * 100 : 0;

  return { issued, paid, rate };
}

function calculateAveragePaymentTime(invoices: any[]): number {
  const paidInvoices = invoices.filter(inv => inv.status === "paid" && inv.issue_date && inv.paid_at);
  
  if (paidInvoices.length === 0) return 0;

  const totalDays = paidInvoices.reduce((sum, inv) => {
    const issueDate = new Date(inv.issue_date);
    const paidDate = new Date(inv.paid_at);
    const days = Math.floor((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return totalDays / paidInvoices.length;
}

function calculateSummary(invoices: any[]): {
  totalRevenue: number;
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  invoiceCount: number;
} {
  const now = new Date();
  const totalRevenue = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

  const totalPending = invoices
    .filter(inv => inv.status === "pending" && (!inv.due_date || new Date(inv.due_date) >= now))
    .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

  const totalOverdue = invoices
    .filter(inv => inv.status === "pending" && inv.due_date && new Date(inv.due_date) < now)
    .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

  const totalPaid = totalRevenue;
  const invoiceCount = invoices.length;

  return {
    totalRevenue,
    totalPending,
    totalOverdue,
    totalPaid,
    invoiceCount,
  };
}

