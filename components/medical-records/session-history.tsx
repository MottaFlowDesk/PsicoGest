"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/medical-records/record-form";
import { cn } from "@/lib/utils";
import {
    getPatientSessions,
    type PatientSession,
} from "@/app/dashboard/patients/[id]/records/actions";

interface SessionHistoryProps {
    patientId: string;
    professionalId: string;
}

export function SessionHistory({ patientId }: SessionHistoryProps) {
    const [sessions, setSessions] = useState<PatientSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const data = await getPatientSessions(patientId);
            setSessions(data);
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchSessions();
    }, [patientId]);

    const toggleExpand = (id: string) => {
        setExpandedSession(expandedSession === id ? null : id);
    };

    if (loading) return <div className="text-center py-8">Carregando histórico...</div>;

    if (sessions.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Nenhuma sessão registrada</h3>
                <p className="text-slate-500">Agende um atendimento para começar a gerar histórico.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => {
                const record = session.medical_records?.[0];
                const hasEvolucao = Boolean(record?.content);
                const isPast = new Date(session.scheduled_at) < new Date();

                return (
                    <div key={session.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <div
                            className={cn(
                                "p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
                                expandedSession === session.id && "bg-slate-50"
                            )}
                            onClick={() => toggleExpand(session.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-12 h-12 rounded-lg border",
                                    isPast ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-blue-50 border-blue-100 text-blue-600"
                                )}>
                                    <span className="text-xs font-medium uppercase">{format(new Date(session.scheduled_at), "MMM", { locale: ptBR })}</span>
                                    <span className="text-lg font-bold">{format(new Date(session.scheduled_at), "dd")}</span>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">
                                            {session.type === "telehealth" ? "Sessão Online" : "Sessão Presencial"}
                                        </h4>
                                        {hasEvolucao && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Evolução Registrada</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(session.scheduled_at), "HH:mm")}
                                        </div>
                                        <span>•</span>
                                        <span className={
                                            session.status === "confirmed"
                                                ? "text-green-700 font-medium"
                                                : ""
                                        }>
                                            {session.status === "completed"
                                                ? "Realizada"
                                                : session.status === "confirmed"
                                                  ? "Confirmada"
                                                  : session.status === "scheduled"
                                                    ? "Agendada"
                                                    : session.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button variant="ghost" size="sm">
                                {expandedSession === session.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>

                        {expandedSession === session.id && (
                            <div className="p-4 border-t border-slate-200 bg-white">
                                <RecordForm
                                    appointmentId={session.id}
                                    patientId={patientId}
                                    existingRecord={record ? {
                                        id: record.id,
                                        title: record.title,
                                        content: record.content,
                                    } : null}
                                    onSaved={fetchSessions}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
