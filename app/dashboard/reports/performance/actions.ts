"use server";

import { createClient } from "@/lib/supabase/server";
import { PerformanceReportData, ReportFilters } from "@/lib/reports/types";
import { getPeriodRange, getPreviousPeriodRange } from "@/lib/reports/utils";
import { format, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getPerformanceReportData(filters: ReportFilters): Promise<PerformanceReportData> {
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

  // Fetch data for current and previous periods
  const [currentInvoices, prevInvoices, currentAppointments, prevAppointments, currentPatients, prevPatients] = await Promise.all([
    // Current period invoices
    supabase
      .from("invoices")
      .select("amount_cents, status, paid_at")
      .eq("professional_id", professional.id)
      .gte("issue_date", start.toISOString().split("T")[0])
      .lte("issue_date", end.toISOString().split("T")[0]),
    
    // Previous period invoices
    supabase
      .from("invoices")
      .select("amount_cents, status, paid_at")
      .eq("professional_id", professional.id)
      .gte("issue_date", prevStart.toISOString().split("T")[0])
      .lte("issue_date", prevEnd.toISOString().split("T")[0]),
    
    // Current period appointments
    supabase
      .from("appointments")
      .select("id, status, scheduled_at")
      .eq("professional_id", professional.id)
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString()),
    
    // Previous period appointments
    supabase
      .from("appointments")
      .select("id, status, scheduled_at")
      .eq("professional_id", professional.id)
      .gte("scheduled_at", prevStart.toISOString())
      .lte("scheduled_at", prevEnd.toISOString()),
    
    // Current patients
    supabase
      .from("patients")
      .select("id, created_at")
      .eq("professional_id", professional.id)
      .eq("archived", false)
      .lte("created_at", end.toISOString()),
    
    // Previous patients
    supabase
      .from("patients")
      .select("id, created_at")
      .eq("professional_id", professional.id)
      .eq("archived", false)
      .lte("created_at", prevEnd.toISOString()),
  ]);

  // Calculate KPIs
  const currentRevenue = (currentInvoices.data || [])
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
  
  const prevRevenue = (prevInvoices.data || [])
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;

  const currentAppts = (currentAppointments.data || []).length;
  const prevAppts = (prevAppointments.data || []).length;

  const currentPats = (currentPatients.data || []).length;
  const prevPats = (prevPatients.data || []).length;

  const currentNoShows = (currentAppointments.data || []).filter(a => a.status === "no_show").length;
  const prevNoShows = (prevAppointments.data || []).filter(a => a.status === "no_show").length;
  const currentNoShowRate = currentAppts > 0 ? (currentNoShows / currentAppts) * 100 : 0;
  const prevNoShowRate = prevAppts > 0 ? (prevNoShows / prevAppts) * 100 : 0;

  const currentAvgRevenue = currentAppts > 0 ? currentRevenue / currentAppts : 0;
  const prevAvgRevenue = prevAppts > 0 ? prevRevenue / prevAppts : 0;

  // Calculate trends
  const trends = generateTrends(currentInvoices.data || [], currentAppointments.data || [], currentPatients.data || [], filters.period, start, end);

  // Calculate health score
  const health = calculateHealth(currentRevenue, currentAppts, currentNoShowRate, currentPats);

  return {
    kpis: {
      revenue: {
        current: currentRevenue,
        previous: prevRevenue,
        change: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      },
      appointments: {
        current: currentAppts,
        previous: prevAppts,
        change: prevAppts > 0 ? ((currentAppts - prevAppts) / prevAppts) * 100 : 0,
      },
      patients: {
        current: currentPats,
        previous: prevPats,
        change: prevPats > 0 ? ((currentPats - prevPats) / prevPats) * 100 : 0,
      },
      noShowRate: {
        current: currentNoShowRate,
        previous: prevNoShowRate,
        change: prevNoShowRate > 0 ? ((currentNoShowRate - prevNoShowRate) / prevNoShowRate) * 100 : 0,
      },
      averageRevenuePerSession: {
        current: currentAvgRevenue,
        previous: prevAvgRevenue,
        change: prevAvgRevenue > 0 ? ((currentAvgRevenue - prevAvgRevenue) / prevAvgRevenue) * 100 : 0,
      },
    },
    trends,
    health,
  };
}

function generateTrends(
  invoices: any[],
  appointments: any[],
  patients: any[],
  period: string,
  start: Date,
  end: Date
): { period: string; revenue: number; appointments: number; patients: number }[] {
  if (period === "quarter" || period === "year") {
    const months = eachMonthOfInterval({ start, end });
    return months.map(month => {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.issue_date || inv.paid_at);
        return invDate >= monthStart && invDate <= monthEnd && inv.status === "paid";
      });
      const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100;
      
      const monthAppts = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduled_at);
        return aptDate >= monthStart && aptDate <= monthEnd;
      }).length;
      
      const monthPats = patients.filter(p => {
        const patDate = new Date(p.created_at);
        return patDate >= monthStart && patDate <= monthEnd;
      }).length;

      return {
        period: format(month, "MMM/yyyy", { locale: ptBR }),
        revenue: monthRevenue,
        appointments: monthAppts,
        patients: monthPats,
      };
    });
  }

  return [{
    period: "Período",
    revenue: invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) / 100,
    appointments: appointments.length,
    patients: patients.length,
  }];
}

function calculateHealth(
  revenue: number,
  appointments: number,
  noShowRate: number,
  patients: number
): {
  score: number;
  indicators: { name: string; status: "good" | "warning" | "critical"; value: number; target: number }[];
} {
  const indicators: Array<{ name: string; status: "good" | "warning" | "critical"; value: number; target: number }> = [
    {
      name: "Receita Mensal",
      status: revenue >= 5000 ? "good" : revenue >= 2000 ? "warning" : "critical",
      value: revenue,
      target: 5000,
    },
    {
      name: "Atendimentos",
      status: appointments >= 40 ? "good" : appointments >= 20 ? "warning" : "critical",
      value: appointments,
      target: 40,
    },
    {
      name: "Taxa de No-Show",
      status: noShowRate <= 5 ? "good" : noShowRate <= 10 ? "warning" : "critical",
      value: noShowRate,
      target: 5,
    },
    {
      name: "Pacientes Ativos",
      status: patients >= 30 ? "good" : patients >= 15 ? "warning" : "critical",
      value: patients,
      target: 30,
    },
  ];

  const goodCount = indicators.filter(i => i.status === "good").length;
  const score = (goodCount / indicators.length) * 100;

  return { score: Math.round(score), indicators };
}

