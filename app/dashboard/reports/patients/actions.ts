"use server";

import { createClient } from "@/lib/supabase/server";
import { PatientReportData, ReportFilters, PeriodFilter } from "@/lib/reports/types";
import { getPeriodRange, groupByPeriod } from "@/lib/reports/utils";
import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getPatientReportData(filters: ReportFilters): Promise<PatientReportData> {
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

  // Fetch all patients
  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select("id, full_name, created_at, archived")
    .eq("professional_id", professional.id)
    .order("created_at", { ascending: true });

  if (patientsError) {
    throw new Error("Failed to fetch patient data");
  }

  // Fetch appointments for activity analysis
  const { data: appointments } = await supabase
    .from("appointments")
    .select("patient_id, scheduled_at, status")
    .eq("professional_id", professional.id)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString());

  const growth = generateGrowthData(patients || [], filters.period, start, end);
  const activity = generateActivityData(patients || [], appointments || [], filters.period, start, end);
  const topPatients = calculateTopPatients(patients || [], appointments || []);
  const retention = calculateRetention(patients || [], appointments || [], filters.period, start, end);
  const summary = calculateSummary(patients || [], appointments || []);

  return {
    growth,
    activity,
    topPatients,
    retention,
    summary,
  };
}

function generateGrowthData(
  patients: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; newPatients: number; totalPatients: number; activePatients: number }[] {
  const grouped = groupByPeriod(patients, (p) => new Date(p.created_at), period);

  let periods: Date[];
  switch (period) {
    case "week":
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

  let cumulativeTotal = 0;

  return periods.map(periodDate => {
    const key = format(periodDate, period === "quarter" || period === "year" ? "yyyy-MM" : "yyyy-MM-dd");
    const periodPatients = grouped.get(key) || [];
    const newPatients = periodPatients.length;
    cumulativeTotal += newPatients;

    return {
      period: format(periodDate, period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: ptBR }),
      newPatients,
      totalPatients: cumulativeTotal,
      activePatients: cumulativeTotal, // Simplified
    };
  });
}

function generateActivityData(
  patients: any[],
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; active: number; inactive: number; new: number }[] {
  const patientAppointments = new Map<string, number>();
  appointments.forEach(apt => {
    if (apt.patient_id) {
      patientAppointments.set(apt.patient_id, (patientAppointments.get(apt.patient_id) || 0) + 1);
    }
  });

  const activePatientIds = new Set(Array.from(patientAppointments.keys()));
  const newPatients = patients.filter(p => new Date(p.created_at) >= start && new Date(p.created_at) <= end);

  return [{
    period: "Período",
    active: activePatientIds.size,
    inactive: patients.length - activePatientIds.size,
    new: newPatients.length,
  }];
}

function calculateTopPatients(
  patients: any[],
  appointments: any[]
): { patientId: string; patientName: string; sessionCount: number; lastSession: Date | null }[] {
  const patientAppointments = new Map<string, { count: number; lastSession: Date | null }>();

  appointments.forEach(apt => {
    if (apt.patient_id) {
      const existing = patientAppointments.get(apt.patient_id) || { count: 0, lastSession: null };
      existing.count++;
      const aptDate = new Date(apt.scheduled_at);
      if (!existing.lastSession || aptDate > existing.lastSession) {
        existing.lastSession = aptDate;
      }
      patientAppointments.set(apt.patient_id, existing);
    }
  });

  const patientMap = new Map(patients.map(p => [p.id, p.full_name]));

  return Array.from(patientAppointments.entries())
    .map(([patientId, data]) => ({
      patientId,
      patientName: patientMap.get(patientId) || "Desconhecido",
      sessionCount: data.count,
      lastSession: data.lastSession,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 10);
}

function calculateRetention(
  patients: any[],
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; retained: number; churned: number; rate: number }[] {
  // Simplified retention calculation
  const activePatients = new Set(appointments.map(apt => apt.patient_id).filter(Boolean));
  const totalPatients = patients.length;
  const retained = activePatients.size;
  const churned = totalPatients - retained;
  const rate = totalPatients > 0 ? (retained / totalPatients) * 100 : 0;

  return [{
    period: "Período",
    retained,
    churned,
    rate: Math.round(rate * 100) / 100,
  }];
}

function calculateSummary(
  patients: any[],
  appointments: any[]
): {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  newThisPeriod: number;
  averageSessionsPerPatient: number;
} {
  const activePatientIds = new Set(appointments.map(apt => apt.patient_id).filter(Boolean));
  const totalPatients = patients.length;
  const activePatients = activePatientIds.size;
  const inactivePatients = totalPatients - activePatients;
  const newThisPeriod = patients.filter(p => !p.archived && new Date(p.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  
  const patientSessionCounts = new Map<string, number>();
  appointments.forEach(apt => {
    if (apt.patient_id) {
      patientSessionCounts.set(apt.patient_id, (patientSessionCounts.get(apt.patient_id) || 0) + 1);
    }
  });

  const totalSessions = Array.from(patientSessionCounts.values()).reduce((sum, count) => sum + count, 0);
  const averageSessionsPerPatient = activePatients > 0 ? Math.round((totalSessions / activePatients) * 100) / 100 : 0;

  return {
    totalPatients,
    activePatients,
    inactivePatients,
    newThisPeriod,
    averageSessionsPerPatient,
  };
}

