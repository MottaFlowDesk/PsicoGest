import { jsPDF } from "jspdf";
// @ts-ignore - jsPDF types may not be perfect
import { ExportOptions, FinancialReportData, AppointmentReportData, PatientReportData, PerformanceReportData } from "./types";
import { formatCurrency, formatPercentage, formatDate, getPeriodRange } from "./utils";

export async function exportToPDF(
  reportType: ExportOptions["reportType"],
  data: FinancialReportData | AppointmentReportData | PatientReportData | PerformanceReportData,
  filters: ExportOptions["filters"]
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.text("PsicoGest - Relatório", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(12);
  const reportTypeLabel = {
    financial: "Relatório Financeiro",
    appointments: "Relatório de Atendimentos",
    patients: "Relatório de Pacientes",
    performance: "Relatório de Performance",
  }[reportType];
  doc.text(reportTypeLabel, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  const { start, end } = getPeriodRange(filters.period, filters.startDate, filters.endDate);
  doc.setFontSize(10);
  doc.text(`Período: ${formatDate(start)} - ${formatDate(end)}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  doc.text(`Gerado em: ${formatDate(new Date())}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Content based on report type
  switch (reportType) {
    case "financial":
      addFinancialContent(doc, data as FinancialReportData, yPosition, pageWidth, pageHeight);
      break;
    case "appointments":
      addAppointmentsContent(doc, data as AppointmentReportData, yPosition, pageWidth, pageHeight);
      break;
    case "patients":
      addPatientsContent(doc, data as PatientReportData, yPosition, pageWidth, pageHeight);
      break;
    case "performance":
      addPerformanceContent(doc, data as PerformanceReportData, yPosition, pageWidth, pageHeight);
      break;
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  return doc.output("blob");
}

function addFinancialContent(
  doc: jsPDF,
  data: FinancialReportData,
  startY: number,
  pageWidth: number,
  pageHeight: number
) {
  let y = startY;

  // Summary
  doc.setFontSize(14);
  doc.text("Resumo Financeiro", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Receita Total: ${formatCurrency(data.summary.totalRevenue)}`, 14, y);
  y += 7;
  doc.text(`Pendentes: ${formatCurrency(data.summary.totalPending)}`, 14, y);
  y += 7;
  doc.text(`Vencidos: ${formatCurrency(data.summary.totalOverdue)}`, 14, y);
  y += 7;
  doc.text(`Taxa de Conversão: ${formatPercentage(data.conversionRate.rate)}`, 14, y);
  y += 7;
  doc.text(`Tempo Médio de Recebimento: ${data.averagePaymentTime.toFixed(1)} dias`, 14, y);
}

function addAppointmentsContent(
  doc: jsPDF,
  data: AppointmentReportData,
  startY: number,
  pageWidth: number,
  pageHeight: number
) {
  let y = startY;

  doc.setFontSize(14);
  doc.text("Resumo de Atendimentos", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Total de Atendimentos: ${data.summary.totalAppointments}`, 14, y);
  y += 7;
  doc.text(`Completos: ${data.summary.completed}`, 14, y);
  y += 7;
  doc.text(`Cancelados: ${data.summary.cancelled}`, 14, y);
  y += 7;
  doc.text(`No-Show: ${data.summary.noShow}`, 14, y);
  y += 7;
  doc.text(`Total de Horas: ${data.summary.totalHours}h`, 14, y);
  y += 7;
  doc.text(`Duração Média: ${data.summary.averageDuration}min`, 14, y);
}

function addPatientsContent(
  doc: jsPDF,
  data: PatientReportData,
  startY: number,
  pageWidth: number,
  pageHeight: number
) {
  let y = startY;

  doc.setFontSize(14);
  doc.text("Resumo de Pacientes", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Total de Pacientes: ${data.summary.totalPatients}`, 14, y);
  y += 7;
  doc.text(`Pacientes Ativos: ${data.summary.activePatients}`, 14, y);
  y += 7;
  doc.text(`Pacientes Inativos: ${data.summary.inactivePatients}`, 14, y);
  y += 7;
  doc.text(`Novos no Período: ${data.summary.newThisPeriod}`, 14, y);
  y += 7;
  doc.text(`Média de Sessões por Paciente: ${data.summary.averageSessionsPerPatient}`, 14, y);
}

function addPerformanceContent(
  doc: jsPDF,
  data: PerformanceReportData,
  startY: number,
  pageWidth: number,
  pageHeight: number
) {
  let y = startY;

  doc.setFontSize(14);
  doc.text("KPIs Principais", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Receita: ${formatCurrency(data.kpis.revenue.current)} (${formatPercentage(data.kpis.revenue.change)} vs anterior)`, 14, y);
  y += 7;
  doc.text(`Atendimentos: ${data.kpis.appointments.current} (${formatPercentage(data.kpis.appointments.change)} vs anterior)`, 14, y);
  y += 7;
  doc.text(`Pacientes: ${data.kpis.patients.current} (${formatPercentage(data.kpis.patients.change)} vs anterior)`, 14, y);
  y += 7;
  doc.text(`Taxa No-Show: ${formatPercentage(data.kpis.noShowRate.current)} (${formatPercentage(data.kpis.noShowRate.change)} vs anterior)`, 14, y);
  y += 7;
  doc.text(`Receita/Sessão: ${formatCurrency(data.kpis.averageRevenuePerSession.current)} (${formatPercentage(data.kpis.averageRevenuePerSession.change)} vs anterior)`, 14, y);
  y += 15;

  doc.setFontSize(14);
  doc.text(`Score de Saúde do Negócio: ${data.health.score}%`, 14, y);
}

