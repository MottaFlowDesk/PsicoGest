"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MapPin, Video } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Event } from "@/types";
import { useModal } from "@/providers/modal-context";
import AppointmentDetailsModal from "@/components/schedule/_modals/appointment-details-modal";

function statusConfig(status?: string) {
    switch (status) {
        case "confirmed":
            return { label: "Confirmado", className: "bg-green-600 text-white border-transparent" };
        case "cancelled":
            return { label: "Cancelado", className: "bg-red-600 text-white border-transparent" };
        case "completed":
            return { label: "Realizado", className: "bg-slate-500 text-white border-transparent" };
        case "no_show":
            return { label: "Falta", className: "bg-orange-500 text-white border-transparent" };
        default:
            return { label: "Agendado", className: "bg-blue-600 text-white border-transparent" };
    }
}

interface DayAgendaDialogProps {
    date: Date | null;
    events: Event[];
    onClose: () => void;
}

export function DayAgendaDialog({ date, events, onClose }: DayAgendaDialogProps) {
    const { setOpen } = useModal();
    const sorted = [...events].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const openAppointment = (event: Event) => {
        onClose();
        setOpen(<AppointmentDetailsModal event={event} />);
    };

    return (
        <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="capitalize">
                        {date
                            ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
                            : "Consultas do dia"}
                    </DialogTitle>
                    <DialogDescription>
                        {sorted.length === 0
                            ? "Nenhuma consulta neste dia."
                            : `${sorted.length} consulta${sorted.length > 1 ? "s" : ""}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {sorted.map((event) => {
                        const isOnline =
                            event.metadata?.appointmentType === "telehealth" ||
                            event.metadata?.appointmentType === "online";
                        const status = statusConfig(event.metadata?.status);

                        return (
                            <button
                                key={event.id}
                                type="button"
                                onClick={() => openAppointment(event)}
                                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                            >
                                <div className="w-14 shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                                    {format(new Date(event.startDate), "HH:mm")}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-slate-900">{event.title}</p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                        {isOnline ? (
                                            <Video className="h-3 w-3" />
                                        ) : (
                                            <MapPin className="h-3 w-3" />
                                        )}
                                        {isOnline ? "Teleconsulta" : "Presencial"}
                                        <span aria-hidden>•</span>
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(event.startDate), "HH:mm")}–
                                        {format(new Date(event.endDate), "HH:mm")}
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn("shrink-0 shadow-none", status.className)}
                                >
                                    {status.label}
                                </Badge>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
