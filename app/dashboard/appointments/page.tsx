"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Clock,
    Video,
    MapPin,
    Search,
    Filter,
    MoreVertical,
    FileText,
    CheckCircle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const supabase = createClient();

    useEffect(() => {
        fetchAppointments();
    }, []);

    async function fetchAppointments() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
            .from("appointments")
            .select(`
                *,
                patients (
                    full_name,
                    phone,
                    email
                )
            `)
            .order('scheduled_at', { ascending: true })
            .limit(50);

        setAppointments(data || []);
        setLoading(false);
    }

    // Filter appointments based on search query
    const filteredAppointments = appointments.filter(apt => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const patientName = apt.patients?.full_name?.toLowerCase() || "";

        return patientName.includes(query);
    });

    return (
        <div className="space-y-6">


            {/* Filters & Search - Matching Patients Page Design */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar por paciente..."
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
                        <p className="text-slate-500">Carregando agendamentos...</p>
                    </div>
                ) : !filteredAppointments || filteredAppointments.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            {searchQuery ? "Nenhum agendamento encontrado" : "Agenda vazia"}
                        </h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            {searchQuery
                                ? "Tente buscar com outros termos."
                                : "Nenhum agendamento encontrado."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data / Hora</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paciente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredAppointments.map((apt: any) => {
                                    const date = new Date(apt.scheduled_at);
                                    return (
                                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-900 capitalize">
                                                        {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                                    </span>
                                                    <span className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={14} />
                                                        {format(date, "HH:mm")} ({apt.duration_minutes} min)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xs mr-3">
                                                        {apt.patients?.full_name?.substring(0, 2).toUpperCase() || "UN"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {apt.patients?.full_name || "Desconhecido"}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Particular
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    {apt.type === 'telehealth' ? (
                                                        <><Video size={16} className="text-blue-500" /> Online</>
                                                    ) : (
                                                        <><MapPin size={16} className="text-slate-400" /> Presencial</>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    apt.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                    {apt.status === 'scheduled' ? 'Agendado' :
                                                        apt.status === 'confirmed' ? 'Confirmado' :
                                                            apt.status === 'cancelled' ? 'Cancelado' : apt.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {apt.status !== 'cancelled' && (
                                                        <button className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors" title="Confirmar Presença">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                    <button className="p-1.5 text-slate-400 hover:text-brand-600 rounded hover:bg-brand-50 transition-colors" title="Ver Detalhes">
                                                        <FileText size={18} />
                                                    </button>
                                                    <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
