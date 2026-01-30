"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { ImportPatientDialog } from "@/components/patients/import-dialog";
import { getPatientReportData } from "@/lib/reports/actions-patients";
import { PatientReportData, ReportFilters } from "@/lib/reports/types";
import { ReportFiltersComponent } from "@/components/reports/report-filters";
import { ChartContainer } from "@/components/reports/chart-container";
import { ExportButton } from "@/components/reports/export-button";
import { PatientsGrowthChart } from "@/components/reports/patients-growth-chart";
import { PatientsActivity } from "@/components/reports/patients-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";

export default function PatientsPage() {
    const router = useRouter();
    const [reportData, setReportData] = useState<PatientReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "month" });

    useEffect(() => {
        loadReportData();
    }, []);

    useEffect(() => {
        loadReportData();
    }, [reportFilters]);

    async function loadReportData() {
        setReportLoading(true);
        try {
            const data = await getPatientReportData(reportFilters);
            setReportData(data);
        } catch (error) {
            console.error("Error loading patient report:", error);
        } finally {
            setReportLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie sua base de pacientes</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ImportPatientDialog />
                    {reportData && <ExportButton reportType="patients" filters={reportFilters} disabled={reportLoading} />}
                    <Link href="/dashboard/patients/new">
                        <Button className="bg-brand-600 hover:bg-brand-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Paciente
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Relatórios e Gráficos */}
            <div className="space-y-6">

                <ReportFiltersComponent
                    filters={reportFilters}
                    onFiltersChange={setReportFilters}
                />

                {reportLoading && !reportData ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    </div>
                ) : reportData ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => router.push("/dashboard/patients/list")}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                                    <Users className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.summary.totalPatients}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{reportData.summary.activePatients}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Novos no Período</CardTitle>
                                    <UserPlus className="h-4 w-4 text-purple-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-600">{reportData.summary.newThisPeriod}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Média de Sessões</CardTitle>
                                    <UserX className="h-4 w-4 text-orange-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reportData.summary.averageSessionsPerPatient}</div>
                                    <p className="text-xs text-slate-500 mt-1">por paciente ativo</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartContainer
                                title="Crescimento de Pacientes"
                                description="Evolução da base de pacientes"
                            >
                                <PatientsGrowthChart data={reportData.growth} />
                            </ChartContainer>

                            <ChartContainer
                                title="Atividade de Pacientes"
                                description="Distribuição entre ativos, inativos e novos"
                            >
                                <PatientsActivity data={reportData.activity} />
                            </ChartContainer>
                        </div>

                        {reportData.topPatients.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Pacientes com Mais Sessões</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {reportData.topPatients.map((patient, index) => (
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
                ) : null}
            </div>
        </div>
    );
}
