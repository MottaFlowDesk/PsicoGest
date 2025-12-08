import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    FileText,
    MessageSquare,
    Calendar as CalendarIcon
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";

export default async function PatientsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        redirect("/onboarding");
    }

    const { data: patients } = await supabase
        .from("patients")
        .select("*")
        .eq("professional_id", professional.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie seus pacientes, prontuários e históricos.</p>
                </div>
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
                {patients && patients.length > 0 ? (
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
                                {patients.map((patient) => (
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
                                                <Link href={`/dashboard/patients/${patient.id}`} className="text-slate-400 hover:text-brand-600" title="Ver Prontuário">
                                                    <FileText size={18} />
                                                </Link>
                                                <button className="text-slate-400 hover:text-green-600" title="Whatsapp">
                                                    <MessageSquare size={18} />
                                                </button>
                                                <button className="text-slate-400 hover:text-brand-600" title="Agendar Sessão">
                                                    <CalendarIcon size={18} />
                                                </button>
                                                <button className="text-slate-400 hover:text-slate-600">
                                                    <MoreHorizontal size={18} />
                                                </button>
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
                        <h3 className="text-lg font-medium text-slate-900">Nenhum paciente encontrado</h3>
                        <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                            Comece cadastrando seu primeiro paciente para gerenciar atendimentos e prontuários.
                        </p>
                        <Link href="/dashboard/patients/new" className="mt-6 inline-block">
                            <Button variant="outline">Cadastrar Paciente</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
