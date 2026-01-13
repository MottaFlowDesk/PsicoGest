import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExportOptions, FinancialReportData, AppointmentReportData, PatientReportData, PerformanceReportData } from "@/lib/reports/types";
import { exportToPDF } from "@/lib/reports/export-pdf";
import { exportToExcel } from "@/lib/reports/export-excel";
import { getFinancialReportData } from "@/app/dashboard/reports/financial/actions";
import { getAppointmentReportData } from "@/app/dashboard/reports/appointments/actions";
import { getPatientReportData } from "@/app/dashboard/reports/patients/actions";
import { getPerformanceReportData } from "@/app/dashboard/reports/performance/actions";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ExportOptions = await request.json();
    const { format, reportType, filters } = body;

    // Fetch report data
    let reportData: FinancialReportData | AppointmentReportData | PatientReportData | PerformanceReportData;

    switch (reportType) {
      case "financial":
        reportData = await getFinancialReportData(filters);
        break;
      case "appointments":
        reportData = await getAppointmentReportData(filters);
        break;
      case "patients":
        reportData = await getPatientReportData(filters);
        break;
      case "performance":
        reportData = await getPerformanceReportData(filters);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Generate export
    let blob: Blob;
    let contentType: string;
    let filename: string;

    if (format === "pdf") {
      blob = await exportToPDF(reportType, reportData, filters);
      contentType = "application/pdf";
      filename = `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}.pdf`;
    } else {
      blob = await exportToExcel(reportType, reportData, filters);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}.xlsx`;
    }

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao exportar relatório" },
      { status: 500 }
    );
  }
}

