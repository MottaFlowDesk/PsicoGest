import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";
import {
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    Video,
    MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("professionals")
        .select("full_name, registration_number")
        .eq("user_id", user.id)
        .single();

    if (!profile || !profile.registration_number) {
        redirect("/onboarding");
    }

    // Static stats for design parity (will be connected to real data later)
    const stats = [
        { name: 'Pacientes Ativos', value: '28', change: '+2', changeType: 'positive', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: 'Sessões na Semana', value: '32', change: '+12%', changeType: 'positive', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
        { name: 'Receita Mensal', value: 'R$ 18.2k', change: '+4.5%', changeType: 'positive', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { name: 'Taxa de No-Show', value: '3.2%', change: '-1.5%', changeType: 'positive', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    const upcomingSessions = [
        { id: 1, patient: 'Ana Silva', time: '14:00', type: 'Online', status: 'Confirmado', img: 'https://picsum.photos/id/1/40/40' },
        { id: 2, patient: 'Carlos Mendes', time: '15:30', type: 'Presencial', status: 'Pendente', img: 'https://picsum.photos/id/2/40/40' },
        { id: 3, patient: 'Beatriz Costa', time: '17:00', type: 'Online', status: 'Confirmado', img: 'https://picsum.photos/id/3/40/40' },
    ];

    const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Olá, {profile.full_name?.split(' ')[0] || 'Doutor(a)'} 👋</h1>
                    <p className="text-slate-500 text-sm capitalize">{currentDate}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-shadow">
                        <dt>
                            <div className={`absolute rounded-md p-3 ${item.bg}`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                            </div>
                            <p className="ml-16 text-sm font-medium text-slate-500 truncate">{item.name}</p>
                        </dt>
                        <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                            <p className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                {item.change}
                            </p>
                        </dd>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Sessions */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Próximas Sessões</h2>
                        <Button variant="ghost" className="text-brand-600 text-sm font-medium hover:text-brand-700 hover:bg-brand-50">
                            Ver agenda completa
                        </Button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {upcomingSessions.map((session) => (
                            <div key={session.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        <img className="h-10 w-10 rounded-full object-cover" src={session.img} alt="" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">{session.patient}</h3>
                                        <div className="flex items-center text-xs text-slate-500 gap-2">
                                            <Clock size={14} />
                                            <span>Hoje, {session.time}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{session.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {session.type === 'Online' && (
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold hover:bg-brand-100 transition-colors">
                                            <Video size={14} />
                                            Entrar
                                        </button>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notifications / Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Ações Rápidas</h2>
                    <div className="space-y-3">
                        <div className="w-full">
                            <Button asChild className="w-full justify-start bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
                                <a href="/dashboard/patients/new">
                                    <Users className="mr-2 h-4 w-4" />
                                    Cadastrar Paciente
                                </a>
                            </Button>
                            <p className="text-xs text-slate-400 mt-1 ml-1">Adicionar novo paciente à base</p>
                        </div>

                        <div className="w-full">
                            <NewInvoiceDialog className="w-full justify-start bg-brand-600 hover:bg-brand-700 text-white shadow-sm" />
                            <p className="text-xs text-slate-400 mt-1 ml-1">Lançar pagamento ou despesa</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Lembretes</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                                    <p className="text-sm text-slate-600">Enviar fatura para <strong>Roberto Carlos</strong> (vence hoje)</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                                    <p className="text-sm text-slate-600">Revisar prontuário de <strong>Ana Silva</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
