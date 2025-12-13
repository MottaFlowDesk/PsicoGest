"use client";

import { useState, useEffect } from "react";
import { getAllMedicalRecords, getMedicalRecordsStats, MedicalRecordWithPatient } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    FileText,
    Search,
    Filter,
    Loader2,
    ExternalLink,
    Clock,
    CheckCircle2,
    Edit3,
    FolderOpen,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function MedicalRecordsPage() {
    const [records, setRecords] = useState<MedicalRecordWithPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [periodFilter, setPeriodFilter] = useState("all");
    const [stats, setStats] = useState({ total: 0, drafts: 0, finalized: 0 });

    useEffect(() => {
        fetchRecords();
        fetchStats();
    }, [statusFilter, periodFilter]);

    async function fetchRecords() {
        setLoading(true);
        try {
            const data = await getAllMedicalRecords({
                status: statusFilter as "all" | "draft" | "finalized",
                period: periodFilter as "all" | "7days" | "30days" | "3months",
                search: searchQuery || undefined,
            });
            setRecords(data);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const data = await getMedicalRecordsStats();
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }

    // Filter by search on client side for immediate feedback
    const filteredRecords = records.filter((record) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            record.title.toLowerCase().includes(query) ||
            record.patient?.full_name?.toLowerCase().includes(query)
        );
    });

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Prontuários</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {stats.total} prontuários • {stats.drafts} rascunhos • {stats.finalized} finalizados
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total de Prontuários</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <Edit3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.drafts}</p>
                        <p className="text-sm text-slate-500">Em Rascunho</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.finalized}</p>
                        <p className="text-sm text-slate-500">Finalizados</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar por paciente ou título..."
                        className="pl-10 border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo período</SelectItem>
                            <SelectItem value="7days">Últimos 7 dias</SelectItem>
                            <SelectItem value="30days">Últimos 30 dias</SelectItem>
                            <SelectItem value="3months">Últimos 3 meses</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            <SelectItem value="draft">Rascunho</SelectItem>
                            <SelectItem value="finalized">Finalizado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Records List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
                        <p className="text-slate-500">Carregando prontuários...</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderOpen className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            {searchQuery || statusFilter !== "all" || periodFilter !== "all"
                                ? "Nenhum prontuário encontrado"
                                : "Nenhum prontuário cadastrado"}
                        </h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            {searchQuery || statusFilter !== "all" || periodFilter !== "all"
                                ? "Tente ajustar os filtros ou termos de busca."
                                : "Os prontuários são criados na página de cada paciente."}
                        </p>
                        {!searchQuery && statusFilter === "all" && periodFilter === "all" && (
                            <Link href="/dashboard/patients">
                                <Button variant="outline" className="mt-4">
                                    Ver Pacientes
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Paciente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Título
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Última Edição
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Versão
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredRecords.map((record) => (
                                    <tr
                                        key={record.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage
                                                        src={record.patient?.avatar_url || undefined}
                                                    />
                                                    <AvatarFallback className="bg-brand-100 text-brand-700 text-sm font-medium">
                                                        {record.patient?.full_name
                                                            ? getInitials(record.patient.full_name)
                                                            : "??"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {record.patient?.full_name || "Paciente não encontrado"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm text-slate-900 font-medium">
                                                    {record.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {record.status === "finalized" ? (
                                                <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Finalizado
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-orange-50 text-orange-700 border-orange-200"
                                                >
                                                    <Edit3 className="h-3 w-3 mr-1" />
                                                    Rascunho
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <span title={format(new Date(record.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
                                                    {formatDistanceToNow(new Date(record.updated_at), {
                                                        addSuffix: true,
                                                        locale: ptBR,
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-500">
                                                v{record.current_version}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                href={`/dashboard/patients/${record.patient_id}?tab=prontuario`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Ver Prontuário
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

