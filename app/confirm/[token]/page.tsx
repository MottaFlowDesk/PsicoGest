"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Calendar, Clock, MapPin, Video, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AppointmentData {
    id: string;
    patient_name: string;
    professional_name: string;
    scheduled_at: string;
    duration_minutes: number;
    type: "in_person" | "telehealth";
    status: string;
    meeting_link?: string;
}

export default function ConfirmAppointmentPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [appointment, setAppointment] = useState<AppointmentData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [meetLink, setMeetLink] = useState<string | null>(null);

    useEffect(() => {
        fetchAppointment();
    }, [token]);

    async function fetchAppointment() {
        try {
            const response = await fetch(`/api/appointments/confirm/${token}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Agendamento não encontrado");
                return;
            }

            setAppointment(data);
            
            if (data.status === "confirmed") {
                setConfirmed(true);
                setMeetLink(data.meeting_link);
            }
        } catch (err) {
            setError("Erro ao carregar agendamento");
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirm() {
        setConfirming(true);
        try {
            const response = await fetch(`/api/appointments/confirm/${token}`, {
                method: "POST",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao confirmar");
            }

            setConfirmed(true);
            setMeetLink(data.meeting_link);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setConfirming(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                    <p className="text-slate-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error && !appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                            Agendamento não encontrado
                        </h2>
                        <p className="text-slate-600">
                            {error}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!appointment) return null;

    const scheduledDate = new Date(appointment.scheduled_at);
    const formattedDate = format(scheduledDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    const formattedTime = format(scheduledDate, "HH:mm");
    const endTime = new Date(scheduledDate.getTime() + appointment.duration_minutes * 60000);
    const formattedEndTime = format(endTime, "HH:mm");

    if (confirmed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-xl border-0">
                    <CardHeader className="text-center pb-2">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl text-green-900">
                            Presença Confirmada!
                        </CardTitle>
                        <CardDescription>
                            Sua sessão está confirmada
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-green-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-green-600" />
                                <span className="text-slate-700 capitalize">{formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-green-600" />
                                <span className="text-slate-700">{formattedTime} - {formattedEndTime}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {appointment.type === "telehealth" ? (
                                    <Video className="w-5 h-5 text-green-600" />
                                ) : (
                                    <MapPin className="w-5 h-5 text-green-600" />
                                )}
                                <span className="text-slate-700">
                                    {appointment.type === "telehealth" ? "Online (Google Meet)" : "Presencial"}
                                </span>
                            </div>
                        </div>

                        {meetLink && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600 text-center">
                                    Clique no botão abaixo para entrar na reunião no horário agendado:
                                </p>
                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-700" 
                                    size="lg"
                                    asChild
                                >
                                    <a href={meetLink} target="_blank" rel="noopener noreferrer">
                                        <Video className="w-5 h-5 mr-2" />
                                        Entrar na Reunião
                                    </a>
                                </Button>
                                <p className="text-xs text-slate-500 text-center break-all">
                                    {meetLink}
                                </p>
                            </div>
                        )}

                        <p className="text-center text-sm text-slate-500">
                            Sessão com <strong>{appointment.professional_name}</strong>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-xl border-0">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-brand-600" />
                    </div>
                    <CardTitle className="text-2xl">Confirmar Presença</CardTitle>
                    <CardDescription>
                        Sessão com {appointment.professional_name}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-brand-600" />
                            <span className="text-slate-700 capitalize">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-brand-600" />
                            <span className="text-slate-700">{formattedTime} - {formattedEndTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {appointment.type === "telehealth" ? (
                                <Video className="w-5 h-5 text-brand-600" />
                            ) : (
                                <MapPin className="w-5 h-5 text-brand-600" />
                            )}
                            <span className="text-slate-700">
                                {appointment.type === "telehealth" ? "Online (Google Meet)" : "Presencial"}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button 
                        className="w-full bg-brand-600 hover:bg-brand-700" 
                        size="lg"
                        onClick={handleConfirm}
                        disabled={confirming}
                    >
                        {confirming ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Confirmando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Confirmar Presença
                            </>
                        )}
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        Precisa reagendar? Entre em contato diretamente com o profissional.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

