"use client";

import { Video, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInMinutes } from "date-fns";

interface TelehealthEnterButtonProps {
    meetingLink: string | null;
    scheduledAt: string;
    status: string;
}

export function TelehealthEnterButton({ meetingLink, scheduledAt, status }: TelehealthEnterButtonProps) {
    const sessionDate = new Date(scheduledAt);
    const now = new Date();
    const minutesUntilSession = differenceInMinutes(sessionDate, now);
    
    // Permitir entrar 15 minutos antes do agendamento
    const canEnter = minutesUntilSession <= 15 && minutesUntilSession >= -60; // até 1 hora depois também
    const isTooEarly = minutesUntilSession > 15;
    const isTooLate = minutesUntilSession < -60;
    
    // Só mostrar se o agendamento estiver confirmado ou agendado
    const isActive = status === "confirmed" || status === "scheduled";
    
    if (!meetingLink || !isActive) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                        disabled
                    >
                        <Video size={14} />
                        Entrar
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        {!meetingLink 
                            ? "Link do Google Meet não disponível. O link será gerado após a confirmação do agendamento."
                            : "Agendamento não está ativo"}
                    </p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (isTooEarly) {
        const minutesLeft = Math.ceil(minutesUntilSession);
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                        disabled
                    >
                        <Clock size={14} />
                        Em {minutesLeft}min
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        Você pode entrar na sala {minutesLeft <= 15 ? "agora" : `em ${minutesLeft - 15} minutos`}
                    </p>
                </TooltipContent>
            </Tooltip>
        );
    }

    if (isTooLate) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                        disabled
                    >
                        <Video size={14} />
                        Encerrado
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>O horário desta sessão já passou</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold hover:bg-brand-100 transition-colors"
            onClick={() => {
                if (meetingLink) {
                    window.open(meetingLink, "_blank", "noopener,noreferrer");
                }
            }}
        >
            <Video size={14} />
            Entrar
        </Button>
    );
}

