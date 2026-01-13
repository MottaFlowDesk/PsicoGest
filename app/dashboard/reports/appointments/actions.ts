"use server";

import { createClient } from "@/lib/supabase/server";
import { AppointmentReportData, ReportFilters } from "@/lib/reports/types";
import { getPeriodRange, groupByPeriod, PeriodFilter } from "@/lib/reports/utils";
import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getAppointmentReportData(filters: ReportFilters): Promise<AppointmentReportData> {
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

  // Build query
  let query = supabase
    .from("appointments")
    .select(`
      id,
      scheduled_at,
      duration_minutes,
      type,
      status,
      cancelled_at,
      cancelled_by,
      cancellation_reason
    `)
    .eq("professional_id", professional.id)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });

  // Apply filters
  if (filters.appointmentType && filters.appointmentType !== "all") {
    query = query.eq("type", filters.appointmentType);
  }

  if (filters.appointmentStatus && filters.appointmentStatus !== "all") {
    query = query.eq("status", filters.appointmentStatus);
  }

  if (filters.patientId) {
    query = query.eq("patient_id", filters.patientId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to fetch appointment data");
  }

  // Process data
  const volume = generateVolumeData(appointments || [], filters.period, start, end);
  const statusDistribution = calculateStatusDistribution(appointments || []);
  const typeDistribution = calculateTypeDistribution(appointments || []);
  const productivity = calculateProductivity(appointments || [], filters.period, start, end);
  const occupancy = calculateOccupancy(appointments || [], filters.period, start, end);
  const noShowAnalysis = calculateNoShowAnalysis(appointments || [], filters.period, start, end);
  const averageDuration = calculateAverageDuration(appointments || []);
  const cancellationAnalysis = calculateCancellationAnalysis(appointments || [], filters.period, start, end);
  const summary = calculateSummary(appointments || []);

  return {
    volume,
    statusDistribution,
    typeDistribution,
    productivity,
    occupancy,
    noShowAnalysis,
    averageDuration,
    cancellationAnalysis,
    summary,
  };
}

function generateVolumeData(
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; count: number; completed: number; cancelled: number; noShow: number }[] {
  const grouped = groupByPeriod(appointments, (apt) => new Date(apt.scheduled_at), period);

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
    const periodAppointments = grouped.get(key) || [];
    
    return {
      period: format(periodDate, period === "today" ? "HH:mm" : period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: ptBR }),
      count: periodAppointments.length,
      completed: periodAppointments.filter(a => a.status === "completed").length,
      cancelled: periodAppointments.filter(a => a.status === "cancelled").length,
      noShow: periodAppointments.filter(a => a.status === "no_show").length,
    };
  });
}

function calculateStatusDistribution(appointments: any[]): { status: string; count: number; percentage: number }[] {
  const total = appointments.length;
  const statuses = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
  const distribution: Record<string, number> = {};

  statuses.forEach(status => {
    distribution[status] = 0;
  });

  appointments.forEach(apt => {
    if (!distribution[apt.status]) {
      distribution[apt.status] = 0;
    }
    distribution[apt.status]++;
  });

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

function calculateTypeDistribution(appointments: any[]): { type: string; count: number; percentage: number }[] {
  const total = appointments.length;
  const types = ["in_person", "telehealth"];
  const distribution: Record<string, number> = {};

  types.forEach(type => {
    distribution[type] = 0;
  });

  appointments.forEach(apt => {
    if (!distribution[apt.type]) {
      distribution[apt.type] = 0;
    }
    distribution[apt.type]++;
  });

  return Object.entries(distribution).map(([type, count]) => ({
    type: type === "in_person" ? "Presencial" : "Teleconsulta",
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

function calculateProductivity(
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; sessions: number; hours: number; averagePerDay: number }[] {
  const completed = appointments.filter(a => a.status === "completed");
  const grouped = groupByPeriod(completed, (apt) => new Date(apt.scheduled_at), period);

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
    const periodAppointments = grouped.get(key) || [];
    const totalMinutes = periodAppointments.reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0);
    const hours = totalMinutes / 60;

    return {
      period: format(periodDate, period === "today" ? "HH:mm" : period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: ptBR }),
      sessions: periodAppointments.length,
      hours: Math.round(hours * 100) / 100,
      averagePerDay: periodAppointments.length,
    };
  });
}

function calculateOccupancy(
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; available: number; booked: number; percentage: number }[] {
  // Simplified occupancy calculation
  // In a real scenario, this would consider availability settings
  const grouped = groupByPeriod(appointments, (apt) => new Date(apt.scheduled_at), period);

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

  return periods.map(periodDate => {
    const key = format(periodDate, period === "quarter" || period === "year" ? "yyyy-MM" : "yyyy-MM-dd");
    const periodAppointments = grouped.get(key) || [];
    const booked = periodAppointments.length;
    // Assume 8 hours of availability per day (480 minutes)
    const available = 480;
    const percentage = available > 0 ? (booked / available) * 100 : 0;

    return {
      period: format(periodDate, period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: require("date-fns/locale/pt-BR") }),
      available,
      booked,
      percentage: Math.round(percentage * 100) / 100,
    };
  });
}

function calculateNoShowAnalysis(
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; total: number; noShows: number; rate: number }[] {
  const grouped = groupByPeriod(appointments, (apt) => new Date(apt.scheduled_at), period);

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

  return periods.map(periodDate => {
    const key = format(periodDate, period === "quarter" || period === "year" ? "yyyy-MM" : "yyyy-MM-dd");
    const periodAppointments = grouped.get(key) || [];
    const total = periodAppointments.length;
    const noShows = periodAppointments.filter(a => a.status === "no_show").length;
    const rate = total > 0 ? (noShows / total) * 100 : 0;

    return {
      period: format(periodDate, period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: require("date-fns/locale/pt-BR") }),
      total,
      noShows,
      rate: Math.round(rate * 100) / 100,
    };
  });
}

function calculateAverageDuration(appointments: any[]): number {
  const completed = appointments.filter(a => a.status === "completed" && a.duration_minutes);
  if (completed.length === 0) return 0;
  
  const total = completed.reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0);
  return Math.round((total / completed.length) * 100) / 100;
}

function calculateCancellationAnalysis(
  appointments: any[],
  period: PeriodFilter,
  start: Date,
  end: Date
): { period: string; total: number; cancelled: number; rate: number; reasons: Record<string, number> }[] {
  const grouped = groupByPeriod(appointments, (apt) => new Date(apt.scheduled_at), period);

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

  return periods.map(periodDate => {
    const key = format(periodDate, period === "quarter" || period === "year" ? "yyyy-MM" : "yyyy-MM-dd");
    const periodAppointments = grouped.get(key) || [];
    const total = periodAppointments.length;
    const cancelled = periodAppointments.filter(a => a.status === "cancelled");
    const rate = total > 0 ? (cancelled.length / total) * 100 : 0;

    const reasons: Record<string, number> = {};
    cancelled.forEach(apt => {
      const reason = apt.cancellation_reason || "Não informado";
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return {
      period: format(periodDate, period === "quarter" || period === "year" ? "MMM/yyyy" : "dd/MM", { locale: require("date-fns/locale/pt-BR") }),
      total,
      cancelled: cancelled.length,
      rate: Math.round(rate * 100) / 100,
      reasons,
    };
  });
}

function calculateSummary(appointments: any[]): {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  totalHours: number;
  averageDuration: number;
} {
  const total = appointments.length;
  const completed = appointments.filter(a => a.status === "completed").length;
  const cancelled = appointments.filter(a => a.status === "cancelled").length;
  const noShow = appointments.filter(a => a.status === "no_show").length;
  
  const totalMinutes = appointments
    .filter(a => a.status === "completed" && a.duration_minutes)
    .reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  
  const averageDuration = calculateAverageDuration(appointments);

  return {
    totalAppointments: total,
    completed,
    cancelled,
    noShow,
    totalHours,
    averageDuration,
  };
}

