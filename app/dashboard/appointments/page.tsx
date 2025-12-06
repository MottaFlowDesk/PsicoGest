import { createClient } from "@/lib/supabase/server";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, Video } from "lucide-react";

export default async function AppointmentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Get today's appointments and future
    // For MVP, just listing all ordered by date descending or filtered?
    // Let's list upcoming first, then recent history perhaps. 
    // Or just a simple list for now.

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
            *,
            patients (
                full_name,
                avatar_url
            )
        `)
        .order('scheduled_at', { ascending: true })
        .gte('scheduled_at', today.toISOString()) // From start of today
        .limit(20);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Agenda</h2>
                    <p className="text-sm text-slate-500">Próximos atendimentos agendados</p>
                </div>
                <NewAppointmentDialog />
            </div>

            {!appointments || appointments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Agenda vazia</h3>
                    <p className="text-slate-500">Nenhum agendamento previsto para os próximos dias.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {appointments.map((apt: any) => (
                        <div key={apt.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                                    <span className="text-xs font-medium uppercase">{format(new Date(apt.scheduled_at), 'MMM', { locale: ptBR })}</span>
                                    <span className="text-lg font-bold">{format(new Date(apt.scheduled_at), 'dd')}</span>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-900">{apt.patients?.full_name || "Paciente Desconhecido"}</h4>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(apt.scheduled_at), 'HH:mm')} ({apt.duration_minutes} min)
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {apt.type === 'telehealth' ? (
                                                <><Video className="h-3 w-3 text-blue-500" /> Online</>
                                            ) : (
                                                <><MapPin className="h-3 w-3 text-slate-500" /> Presencial</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {apt.status === 'scheduled' ? 'Agendado' :
                                        apt.status === 'confirmed' ? 'Confirmado' : apt.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
