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

  const now = new Date();

  // Fetch data for current and previous periods
  const [
    currentRevenueData,
    previousRevenueData,
    currentAppointmentsData,
    previousAppointmentsData,
    currentPatientsData,
    previousPatientsData,
    noShowData,
  ] = await Promise.all([
    supabase.from("invoices").select("amount_cents").eq("professional_id", professional.id).eq("status", "paid").gte("paid_at", start.toISOString()).lte("paid_at", end.toISOString()),
    supabase.from("invoices").select("amount_cents").eq("professional_id", professional.id).eq("status", "paid").gte("paid_at", prevStart.toISOString()).lte("paid_at", prevEnd.toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).gte("scheduled_at", prevStart.toISOString()).lte("scheduled_at", prevEnd.toISOString()),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).eq("archived", false).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).eq("archived", false).gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
    supabase.from("appointments").select("status", { count: "exact" }).eq("professional_id", professional.id).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
  ]);

  const currentRevenue = (currentRevenueData.data?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0) / 100;
  const previousRevenue = (previousRevenueData.data?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0) / 100;
  const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const currentAppointments = currentAppointmentsData.count || 0;
  const previousAppointments = previousAppointmentsData.count || 0;
  const appointmentsChange = previousAppointments > 0 ? ((currentAppointments - previousAppointments) / previousAppointments) * 100 : 0;

  const currentPatients = currentPatientsData.count || 0;
  const previousPatients = previousPatientsData.count || 0;
  const patientsChange = previousPatients > 0 ? ((currentPatients - previousPatients) / previousPatients) * 100 : 0;

  const totalAppointmentsForNoShow = noShowData.count || 0;
  const noShowCount = noShowData.data?.filter(apt => apt.status === "no_show").length || 0;
  const noShowRate = totalAppointmentsForNoShow > 0 ? (noShowCount / totalAppointmentsForNoShow) * 100 : 0;

  const averageRevenuePerSession = currentAppointments > 0 ? currentRevenue / currentAppointments : 0;
  const previousAverageRevenuePerSession = previousAppointments > 0 ? previousRevenue / previousAppointments : 0;
  const averageRevenuePerSessionChange = previousAverageRevenuePerSession > 0 ? ((averageRevenuePerSession - previousAverageRevenuePerSession) / previousAverageRevenuePerSession) * 100 : 0;

  // Trends data (e.g., monthly over the last 6 months)
  const trendMonths = eachMonthOfInterval({
    start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
    end: now,
  });

  const trendsData = await Promise.all(trendMonths.map(async (month) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const [
      monthRevenueResult,
      monthAppointmentsResult,
      monthPatientsResult,
    ] = await Promise.all([
      supabase.from("invoices").select("amount_cents").eq("professional_id", professional.id).eq("status", "paid").gte("paid_at", monthStart.toISOString()).lte("paid_at", monthEnd.toISOString()),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).gte("scheduled_at", monthStart.toISOString()).lte("scheduled_at", monthEnd.toISOString()),
      supabase.from("patients").select("id", { count: "exact", head: true }).eq("professional_id", professional.id).gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
    ]);

    const revenue = (monthRevenueResult.data?.reduce((sum, inv) => sum + (inv.amount_cents || 0), 0) || 0) / 100;
    const appointments = monthAppointmentsResult.count || 0;
    const patients = monthPatientsResult.count || 0;

    return {
      period: format(month, "MMM/yyyy", { locale: ptBR }),
      revenue,
      appointments,
      patients,
    };
  }));

  return {
    kpis: {
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange,
      },
      appointments: {
        current: currentAppointments,
        previous: previousAppointments,
        change: appointmentsChange,
      },
      patients: {
        current: currentPatients,
        previous: previousPatients,
        change: patientsChange,
      },
      noShowRate: {
        current: noShowRate,
        previous: 0, // No easy way to get previous no-show rate without more data
        change: 0,
      },
      averageRevenuePerSession: {
        current: averageRevenuePerSession,
        previous: previousAverageRevenuePerSession,
        change: averageRevenuePerSessionChange,
      },
    },
    trends: trendsData,
    health: calculateHealthScore(currentRevenue, currentAppointments, noShowRate, currentPatients),
  };
}

function calculateHealthScore(
  revenue: number,
  appointments: number,
  noShowRate: number,
  patients: number
): {
  score: number;
  indicators: { name: string; status: "good" | "warning" | "critical"; value: number; target: number }[];
} {
  const indicators = [
    {
      name: "Receita Mensal",
      status: (revenue >= 5000 ? "good" : revenue >= 2000 ? "warning" : "critical") as const,
      value: revenue,
      target: 5000,
    },
    {
      name: "Atendimentos",
      status: (appointments >= 40 ? "good" : appointments >= 20 ? "warning" : "critical") as const,
      value: appointments,
      target: 40,
    },
    {
      name: "Taxa de No-Show",
      status: (noShowRate <= 5 ? "good" : noShowRate <= 10 ? "warning" : "critical") as const,
      value: noShowRate,
      target: 5,
    },
    {
      name: "Pacientes Ativos",
      status: (patients >= 30 ? "good" : patients >= 15 ? "warning" : "critical") as const,
      value: patients,
      target: 30,
    },
  ];

  const goodCount = indicators.filter(i => i.status === "good").length;
  const score = (goodCount / indicators.length) * 100;

  return { score: Math.round(score), indicators };
}

