import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PatientsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch professionals ID first
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        redirect("/onboarding");
    }

    // Fetch patients
    const { data: patients } = await supabase
        .from("patients")
        .select("*")
        .eq("professional_id", professional.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
                    <p className="text-slate-500">Gerencie seus pacientes</p>
                </div>
                <Link href="/dashboard/patients/new">
                    <Button className="bg-brand-600 hover:bg-brand-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Paciente
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {patients && patients.length > 0 ? (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-medium">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Telefone</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {patient.full_name}
                                    </td>
                                    <td className="px-6 py-4">{patient.phone}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                            Ativo
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/patients/${patient.id}`}
                                            className="text-brand-600 hover:text-brand-700 font-medium hover:underline"
                                        >
                                            Ver perfil
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                            Nenhum paciente encontrado
                        </h3>
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
