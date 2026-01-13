import * as XLSX from "xlsx";
import { ExportOptions, FinancialReportData, AppointmentReportData, PatientReportData, PerformanceReportData } from "./types";
import { formatCurrency, formatPercentage, formatDate, getPeriodRange } from "./utils";

export async function exportToExcel(
  reportType: ExportOptions["reportType"],
  data: FinancialReportData | AppointmentReportData | PatientReportData | PerformanceReportData,
  filters: ExportOptions["filters"]
): Promise<Blob> {
  const workbook = XLSX.utils.book_new();

  // Add summary sheet
  const summaryData = generateSummarySheet(reportType, data, filters);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  // Add detailed sheets based on report type
  switch (reportType) {
    case "financial":
      addFinancialSheets(workbook, data as FinancialReportData);
      break;
    case "appointments":
      addAppointmentsSheets(workbook, data as AppointmentReportData);
      break;
    case "patients":
      addPatientsSheets(workbook, data as PatientReportData);
      break;
    case "performance":
      addPerformanceSheets(workbook, data as PerformanceReportData);
      break;
  }

  // Generate blob
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function generateSummarySheet(
  reportType: ExportOptions["reportType"],
  data: FinancialReportData | AppointmentReportData | PatientReportData | PerformanceReportData,
  filters: ExportOptions["filters"]
): any[][] {
  const { start, end } = getPeriodRange(filters.period, filters.startDate, filters.endDate);
  
  const summary: any[][] = [
    ["Relatório", reportType === "financial" ? "Financeiro" : reportType === "appointments" ? "Atendimentos" : reportType === "patients" ? "Pacientes" : "Performance"],
    ["Período", `${formatDate(start)} - ${formatDate(end)}`],
    ["Gerado em", formatDate(new Date())],
    [],
  ];

  switch (reportType) {
    case "financial":
      const financialData = data as FinancialReportData;
      summary.push(["Receita Total", formatCurrency(financialData.summary.totalRevenue)]);
      summary.push(["Pendentes", formatCurrency(financialData.summary.totalPending)]);
      summary.push(["Vencidos", formatCurrency(financialData.summary.totalOverdue)]);
      summary.push(["Taxa de Conversão", formatPercentage(financialData.conversionRate.rate)]);
      summary.push(["Tempo Médio de Recebimento", `${financialData.averagePaymentTime.toFixed(1)} dias`]);
      break;
    case "appointments":
      const appointmentData = data as AppointmentReportData;
      summary.push(["Total de Atendimentos", appointmentData.summary.totalAppointments]);
      summary.push(["Completos", appointmentData.summary.completed]);
      summary.push(["Cancelados", appointmentData.summary.cancelled]);
      summary.push(["No-Show", appointmentData.summary.noShow]);
      summary.push(["Total de Horas", `${appointmentData.summary.totalHours}h`]);
      break;
    case "patients":
      const patientData = data as PatientReportData;
      summary.push(["Total de Pacientes", patientData.summary.totalPatients]);
      summary.push(["Pacientes Ativos", patientData.summary.activePatients]);
      summary.push(["Novos no Período", patientData.summary.newThisPeriod]);
      summary.push(["Média de Sessões", patientData.summary.averageSessionsPerPatient]);
      break;
    case "performance":
      const performanceData = data as PerformanceReportData;
      summary.push(["Receita", formatCurrency(performanceData.kpis.revenue.current)]);
      summary.push(["Atendimentos", performanceData.kpis.appointments.current]);
      summary.push(["Pacientes", performanceData.kpis.patients.current]);
      summary.push(["Score de Saúde", `${performanceData.health.score}%`]);
      break;
  }

  return summary;
}

function addFinancialSheets(workbook: XLSX.WorkBook, data: FinancialReportData) {
  // Revenue sheet
  const revenueData = [["Período", "Receita (R$)"]];
  data.revenue.forEach(item => {
    revenueData.push([item.period, item.amount]);
  });
  const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
  XLSX.utils.book_append_sheet(workbook, revenueSheet, "Receita");

  // Status distribution
  const statusData = [["Status", "Quantidade", "Valor (R$)"]];
  data.statusDistribution.forEach(item => {
    statusData.push([item.status, item.count, item.amount]);
  });
  const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Status");

  // Top patients
  const topPatientsData = [["Paciente", "Receita Total (R$)", "Número de Faturas"]];
  data.topPatients.forEach(patient => {
    topPatientsData.push([patient.patientName, patient.totalRevenue, patient.invoiceCount]);
  });
  const topPatientsSheet = XLSX.utils.aoa_to_sheet(topPatientsData);
  XLSX.utils.book_append_sheet(workbook, topPatientsSheet, "Top Pacientes");
}

function addAppointmentsSheets(workbook: XLSX.WorkBook, data: AppointmentReportData) {
  // Volume sheet
  const volumeData = [["Período", "Total", "Completos", "Cancelados", "No-Show"]];
  data.volume.forEach(item => {
    volumeData.push([item.period, item.count, item.completed, item.cancelled, item.noShow]);
  });
  const volumeSheet = XLSX.utils.aoa_to_sheet(volumeData);
  XLSX.utils.book_append_sheet(workbook, volumeSheet, "Volume");

  // Status distribution
  const statusData = [["Status", "Quantidade", "Percentual (%)"]];
  data.statusDistribution.forEach(item => {
    statusData.push([item.status, item.count, item.percentage]);
  });
  const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Status");
}

function addPatientsSheets(workbook: XLSX.WorkBook, data: PatientReportData) {
  // Growth sheet
  const growthData = [["Período", "Novos", "Total", "Ativos"]];
  data.growth.forEach(item => {
    growthData.push([item.period, item.newPatients, item.totalPatients, item.activePatients]);
  });
  const growthSheet = XLSX.utils.aoa_to_sheet(growthData);
  XLSX.utils.book_append_sheet(workbook, growthSheet, "Crescimento");

  // Top patients
  const topPatientsData = [["Paciente", "Sessões", "Última Sessão"]];
  data.topPatients.forEach(patient => {
    topPatientsData.push([
      patient.patientName,
      patient.sessionCount,
      patient.lastSession ? formatDate(patient.lastSession) : "N/A",
    ]);
  });
  const topPatientsSheet = XLSX.utils.aoa_to_sheet(topPatientsData);
  XLSX.utils.book_append_sheet(workbook, topPatientsSheet, "Top Pacientes");
}

function addPerformanceSheets(workbook: XLSX.WorkBook, data: PerformanceReportData) {
  // KPIs sheet
  const kpisData = [
    ["KPI", "Atual", "Anterior", "Variação (%)"],
    ["Receita", formatCurrency(data.kpis.revenue.current), formatCurrency(data.kpis.revenue.previous), formatPercentage(data.kpis.revenue.change)],
    ["Atendimentos", data.kpis.appointments.current, data.kpis.appointments.previous, formatPercentage(data.kpis.appointments.change)],
    ["Pacientes", data.kpis.patients.current, data.kpis.patients.previous, formatPercentage(data.kpis.patients.change)],
    ["Taxa No-Show", formatPercentage(data.kpis.noShowRate.current), formatPercentage(data.kpis.noShowRate.previous), formatPercentage(data.kpis.noShowRate.change)],
    ["Receita/Sessão", formatCurrency(data.kpis.averageRevenuePerSession.current), formatCurrency(data.kpis.averageRevenuePerSession.previous), formatPercentage(data.kpis.averageRevenuePerSession.change)],
  ];
  const kpisSheet = XLSX.utils.aoa_to_sheet(kpisData);
  XLSX.utils.book_append_sheet(workbook, kpisSheet, "KPIs");

  // Trends sheet
  const trendsData = [["Período", "Receita (R$)", "Atendimentos", "Pacientes"]];
  data.trends.forEach(item => {
    trendsData.push([item.period, item.revenue, item.appointments, item.patients]);
  });
  const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
  XLSX.utils.book_append_sheet(workbook, trendsSheet, "Tendências");
}

