"use client";

import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Calendar,
    Clock,
    User,
    FileText,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Video,
    MapPin,
    Play
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CustomModal,
    CustomModalContent,
    CustomModalHeader,
    CustomModalTitle,
    CustomModalDescription,
    CustomModalFooter,
    CustomModalClose
} from "@/components/ui/custom-modal";
import { Event } from "@/types";
import { useModal } from "@/providers/modal-context";

interface AppointmentDetailsModalProps {
    event: Event;
}

export default function AppointmentDetailsModal({ event }: AppointmentDetailsModalProps) {
    const { setClose } = useModal();

    // Helper to get status configuration
    const getStatusConfig = (status: string = "scheduled") => {
        switch (status) {
            case "confirmed":
                return { label: "Confirmado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 };
            case "cancelled":
                return { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle };
            case "in_progress":
                return { label: "Em Andamento", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Play };
            case "completed":
                return { label: "Realizado", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle2 };
            default:
                return { label: "Agendado", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Calendar };
        }
    };

    const statusConfig = getStatusConfig(event.metadata?.status);
    const StatusIcon = statusConfig.icon;
    const isOnline = event.metadata?.appointmentType === "online";

    return (
        <CustomModal open={true} onOpenChange={(open) => !open && setClose()}>
            <CustomModalContent className="max-w-md">
                <CustomModalHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <Badge
                                variant="outline"
                                className={`mb-2 gap-1 ${statusConfig.color} border shadow-sm`}
                            >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                            </Badge>
                            <CustomModalTitle className="text-xl font-bold flex items-center gap-2">
                                {event.title}
                            </CustomModalTitle>
                            <CustomModalDescription className="text-sm mt-1">
                                Agendamento de Consulta
                            </CustomModalDescription>
                        </div>
                    </div>
                </CustomModalHeader>

                <div className="space-y-6 py-2">
                    {/* Date and Time Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                            <div className="flex items-center text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                Data
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                                {format(event.startDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="text-xs text-slate-500">
                                {format(event.startDate, "yyyy", { locale: ptBR })}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                            <div className="flex items-center text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                Horário
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                                {format(event.startDate, "HH:mm")} - {format(event.endDate, "HH:mm")}
                            </div>
                            <div className="text-xs text-slate-500">
                                {event.description}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Details Section */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-slate-900">Paciente</h4>
                                <p className="text-sm text-slate-600 mt-0.5">{event.title}</p>
                                {event.metadata?.patientId && (
                                    <Button variant="link" className="h-auto p-0 text-xs mt-1 text-blue-600">
                                        Ver perfil do paciente
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                {isOnline ? (
                                    <Video className="w-4 h-4 text-indigo-600" />
                                ) : (
                                    <MapPin className="w-4 h-4 text-indigo-600" />
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-slate-900">Local</h4>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {isOnline ? "Consulta Online" : "Consultório Presencial"}
                                </p>
                            </div>
                        </div>

                        {event.description && !event.description.includes("Duração") && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FileText className="w-4 h-4 text-slate-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900">Observações</h4>
                                    <p className="text-sm text-slate-600 mt-0.5">{event.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <CustomModalFooter className="gap-2 sm:gap-0 mt-4">
                    <div className="flex w-full gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setClose()}
                            className="flex-1"
                        >
                            Fechar
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            disabled={event.metadata?.status === "completed"}
                        >
                            <Play className="w-4 h-4" />
                            Iniciar Sessão
                        </Button>
                    </div>
                </CustomModalFooter>
            </CustomModalContent>
        </CustomModal>
    );
}
