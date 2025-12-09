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
    Loader2
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { PatientActionsMenu } from "@/components/patients/patient-actions-menu";

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const supabase = createClient();

    useEffect(() => {
        fetchPatients();
    }, []);

    async function fetchPatients() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: professional } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!professional) return;

        const { data } = await supabase
            .from("patients")
            .select("*")
            .eq("professional_id", professional.id)
            .eq("archived", false)
            .order("created_at", { ascending: false });

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
                <Link href="/dashboard/patients/new">
                    <Button className="bg-brand-600 hover:bg-brand-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Paciente
                    </Button>
                </Link>
            </div>

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
                    <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2">
                        <Filter size={18} />
                        Filtros
                    </Button>
                </div>
            </div>

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
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                                Ativo
                                            </span>
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
                                                <NewAppointmentDialog
                                                    defaultPatientId={patient.id}
                                                    triggerLabel=""
                                                    className="p-1.5 h-auto bg-transparent hover:bg-transparent text-slate-400 hover:text-brand-600 transition-colors shadow-none"
                                                    variant="ghost"
                                                />
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
                            {searchQuery ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
                        </h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            {searchQuery
                                ? "Tente buscar com outros termos."
                                : "Comece cadastrando seu primeiro paciente para gerenciar atendimentos e prontuários."
                            }
                        </p>
                        {!searchQuery && (
                            <Link href="/dashboard/patients/new" className="mt-6 inline-block">
                                <Button variant="outline">Cadastrar Paciente</Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
