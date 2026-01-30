export type PeriodFilter = "today" | "week" | "month" | "quarter" | "year" | "custom";

export type AppointmentTypeFilter = "all" | "in_person" | "telehealth";

export type AppointmentStatusFilter = "all" | "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface ReportFilters {
  period: PeriodFilter;
  startDate?: Date;
  endDate?: Date;
  appointmentType?: AppointmentTypeFilter;
  appointmentStatus?: AppointmentStatusFilter;
  patientId?: string;
}

export interface FinancialReportData {
  revenue: {
    period: string;
    amount: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    amount: number;
  }[];
  trends: {
    period: string;
    current: number;
    previous: number;
    change: number;
  }[];
  conversionRate: {
    issued: number;
    paid: number;
    rate: number;
  };
  averagePaymentTime: number; // days
  summary: {
    totalRevenue: number;
    totalPending: number;
    totalOverdue: number;
    totalPaid: number;
    invoiceCount: number;
  };
}

export interface AppointmentReportData {
  volume: {
    period: string;
    count: number;
    completed: number;
    cancelled: number;
    noShow: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  typeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  productivity: {
    period: string;
    sessions: number;
    hours: number;
    averagePerDay: number;
  }[];
  occupancy: {
    period: string;
    available: number;
    booked: number;
    percentage: number;
  }[];
  noShowAnalysis: {
    period: string;
    total: number;
    noShows: number;
    rate: number;
  }[];
  averageDuration: number; // minutes
  cancellationAnalysis: {
    period: string;
    total: number;
    cancelled: number;
    rate: number;
    reasons: Record<string, number>;
  }[];
  summary: {
    totalAppointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    totalHours: number;
    averageDuration: number;
  };
}

export interface PatientReportData {
  growth: {
    period: string;
    newPatients: number;
    totalPatients: number;
    activePatients: number;
  }[];
  activity: {
    period: string;
    active: number;
    inactive: number;
    new: number;
  }[];
  topPatients: {
    patientId: string;
    patientName: string;
    sessionCount: number;
    lastSession: Date | null;
  }[];
  retention: {
    period: string;
    retained: number;
    churned: number;
    rate: number;
  }[];
  summary: {
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    newThisPeriod: number;
    averageSessionsPerPatient: number;
  };
}

export interface PerformanceReportData {
  kpis: {
    revenue: {
      current: number;
      previous: number;
      change: number;
    };
    appointments: {
      current: number;
      previous: number;
      change: number;
    };
    patients: {
      current: number;
      previous: number;
      change: number;
    };
    noShowRate: {
      current: number;
      previous: number;
      change: number;
    };
    averageRevenuePerSession: {
      current: number;
      previous: number;
      change: number;
    };
  };
  trends: {
    period: string;
    revenue: number;
    appointments: number;
    patients: number;
  }[];
  health: {
    score: number; // 0-100
    indicators: {
      name: string;
      status: "good" | "warning" | "critical";
      value: number;
      target: number;
    }[];
  };
}

export interface ExportOptions {
  format: "pdf" | "excel";
  reportType: "financial" | "appointments" | "patients" | "performance";
  filters: ReportFilters;
  includeCharts?: boolean;
  includeRawData?: boolean;
}

