"use client";

import { useState, useEffect } from "react";
import { ReportFilters } from "@/lib/reports/types";
import { getPatientReportData } from "./actions";
import { PatientReportData } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ReportHeader } from "@/components/reports/report-header";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { PatientsGrowthChart } from "@/components/reports/patients-growth-chart";
import { PatientsActivity } from "@/components/reports/patients-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function PatientsReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: "month",
  });
  const [data, setData] = useState<PatientReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const reportData = await getPatientReportData(filters);
      setData(reportData);
    } catch (error) {
      console.error("Error loading patient report:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Erro ao carregar dados do relatório</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <ReportHeader
          title="Relatório de Pacientes"
          subtitle="Análise de crescimento e atividade da base de pacientes"
          filters={filters}
        />
        <ExportButton reportType="patients" filters={filters} disabled={loading} />
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalPatients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.summary.activePatients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novos no Período</CardTitle>
                <UserPlus className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{data.summary.newThisPeriod}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média de Sessões</CardTitle>
                <UserX className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.averageSessionsPerPatient}</div>
                <p className="text-xs text-slate-500 mt-1">por paciente ativo</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              title="Crescimento de Pacientes"
              description="Evolução da base de pacientes"
            >
              <PatientsGrowthChart data={data.growth} />
            </ChartContainer>

            <ChartContainer
              title="Atividade de Pacientes"
              description="Distribuição entre ativos, inativos e novos"
            >
              <PatientsActivity data={data.activity} />
            </ChartContainer>
          </div>

          {/* Top Patients */}
          {data.topPatients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pacientes com Mais Sessões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topPatients.map((patient, index) => (
                    <div key={patient.patientId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{patient.patientName}</p>
                          {patient.lastSession && (
                            <p className="text-xs text-slate-500">
                              Última sessão: {new Date(patient.lastSession).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{patient.sessionCount} sessões</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

