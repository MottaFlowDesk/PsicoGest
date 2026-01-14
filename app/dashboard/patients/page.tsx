"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Filter,
    FileText,
    MessageSquare,
    Loader2,
    X,
    Upload,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { PatientActionsMenu } from "@/components/patients/patient-actions-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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

type StatusFilter = "active" | "archived" | "all";

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [reportData, setReportData] = useState<PatientReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportFilters, setReportFilters] = useState<ReportFilters>({ period: "month" });

    useEffect(() => {
        fetchPatients();
        loadReportData();
    }, [statusFilter]);

    useEffect(() => {
        loadReportData();
    }, [reportFilters]);

    async function fetchPatients() {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: professional } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) return;

        let query = supabase
            .from("patients")
            .select("*")
            .eq("professional_id", professional.id)
            .order("created_at", { ascending: false });

        // Apply status filter
        if (statusFilter === "active") {
            query = query.eq("archived", false);
        } else if (statusFilter === "archived") {
            query = query.eq("archived", true);
        }

        const { data } = await query;

        setPatients(data || []);
        setLoading(false);
    }

    // Filter patients based on search query
    const filteredPatients = patients.filter(patient => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const name = patient.full_name?.toLowerCase() || "";
        const email = patient.email?.toLowerCase() || "";
        const phone = patient.phone?.toLowerCase() || "";

        return name.includes(query) || email.includes(query) || phone.includes(query);
    });

    const openWhatsApp = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    };

    const clearFilters = () => {
        setStatusFilter("active");
        setSearchQuery("");
    };

    const hasActiveFilters = statusFilter !== "active" || searchQuery !== "";

    const getStatusBadge = (archived: boolean) => {
        if (archived) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20">
                    Arquivado
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                Ativo
            </span>
        );
    };

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
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
                    <p className="text-slate-500 text-sm">Gerencie sua base de pacientes</p>
                </div>
                <div className="flex gap-2">
                    <ImportPatientDialog />
                    <Link href="/dashboard/patients/new">
                        <Button className="bg-brand-600 hover:bg-brand-700 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Paciente
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Relatórios e Gráficos */}
            <div className="space-y-4">
                <div className="flex justify-end">
                    {reportData && <ExportButton reportType="patients" filters={reportFilters} disabled={reportLoading} />}
                </div>

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
                            <Card>
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

            <>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        className="pl-10 border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2">
                                <Filter size={18} />
                                Filtros
                                {statusFilter !== "active" && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Status do Paciente</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                <DropdownMenuRadioItem value="active">Apenas Ativos</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="archived">Apenas Arquivados</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={clearFilters}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <X size={16} className="mr-1" />
                            Limpar
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                    {statusFilter !== "active" && (
                        <Badge variant="secondary" className="gap-1">
                            Status: {statusFilter === "archived" ? "Arquivados" : "Todos"}
                            <button onClick={() => setStatusFilter("active")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                    {searchQuery && (
                        <Badge variant="secondary" className="gap-1">
                            Busca: {searchQuery}
                            <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-red-500">
                                <X size={12} />
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
                        <p className="text-slate-500">Carregando pacientes...</p>
                    </div>
                ) : filteredPatients && filteredPatients.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome / Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Telefone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                                                    {patient.full_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{patient.full_name}</div>
                                                    <div className="text-sm text-slate-500">{patient.email || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{patient.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(patient.archived)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link href={`/dashboard/patients/${patient.id}`} className="text-slate-400 hover:text-brand-600 transition-colors" title="Ver Prontuário">
                                                    <FileText size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => openWhatsApp(patient.phone)}
                                                    className="text-slate-400 hover:text-green-600 transition-colors"
                                                    title="WhatsApp"
                                                >
                                                    <MessageSquare size={18} />
                                                </button>
                                                {!patient.archived && (
                                                    <NewAppointmentDialog
                                                        defaultPatientId={patient.id}
                                                        triggerLabel=""
                                                        className="p-1.5 h-auto bg-transparent hover:bg-transparent text-slate-400 hover:text-brand-600 transition-colors shadow-none"
                                                        variant="ghost"
                                                    />
                                                )}
                                                <PatientActionsMenu
                                                    patientId={patient.id}
                                                    patientName={patient.full_name}
                                                    onUpdate={fetchPatients}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            {searchQuery || statusFilter !== "active" 
                                ? "Nenhum paciente encontrado" 
                                : "Nenhum paciente cadastrado"}
                        </h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            {searchQuery || statusFilter !== "active"
                                ? "Tente ajustar os filtros ou busca."
                                : "Comece cadastrando seu primeiro paciente para gerenciar atendimentos e prontuários."
                            }
                        </p>
                        {!searchQuery && statusFilter === "active" && (
                            <Link href="/dashboard/patients/new" className="mt-6 inline-block">
                                <Button variant="outline">Cadastrar Paciente</Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
            </>
        </div>
    );
}
