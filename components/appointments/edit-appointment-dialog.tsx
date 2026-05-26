"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { getLocalDateFromISO, getLocalTimeFromISO } from "@/lib/datetime/local-date";
import { updateAppointment } from "@/app/dashboard/appointments/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditAppointmentDialogProps {
    appointment: {
        id: string;
        scheduled_at: string;
        duration_minutes: number;
        type: "in_person" | "telehealth";
        notes?: string | null;
        patients?: {
            full_name: string;
        };
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAppointmentDialog({
    appointment,
    open,
    onOpenChange,
}: EditAppointmentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Form state
    const [date, setDate] = useState(getLocalDateFromISO(appointment.scheduled_at));
    const [time, setTime] = useState(getLocalTimeFromISO(appointment.scheduled_at));
    const [duration, setDuration] = useState(appointment.duration_minutes.toString());
    const [type, setType] = useState(appointment.type);
    const [notes, setNotes] = useState(appointment.notes || "");

    // Reset form when appointment changes
    useEffect(() => {
        if (appointment) {
            setDate(getLocalDateFromISO(appointment.scheduled_at));
            setTime(getLocalTimeFromISO(appointment.scheduled_at));
            setDuration(appointment.duration_minutes.toString());
            setType(appointment.type);
            setNotes(appointment.notes || "");
        }
    }, [appointment]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await updateAppointment({
                appointmentId: appointment.id,
                date,
                time,
                duration: parseInt(duration),
                type,
                notes,
            });

            toast.success("Agendamento atualizado!");
            onOpenChange(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar agendamento");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Agendamento</DialogTitle>
                    <DialogDescription>
                        {appointment.patients?.full_name && (
                            <>Sessão com <strong>{appointment.patients.full_name}</strong></>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Date */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-date" className="text-right">
                            Data
                        </Label>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                id="edit-date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-time" className="text-right">
                            Horário
                        </Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                type="time"
                                id="edit-time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-1/2"
                            />
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger className="w-1/2">
                                    <SelectValue placeholder="Duração" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">30 min</SelectItem>
                                    <SelectItem value="45">45 min</SelectItem>
                                    <SelectItem value="50">50 min</SelectItem>
                                    <SelectItem value="60">1 hora</SelectItem>
                                    <SelectItem value="90">1h30</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Type */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-type" className="text-right">
                            Tipo
                        </Label>
                        <div className="col-span-3">
                            <Select value={type} onValueChange={(v) => setType(v as "in_person" | "telehealth")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_person">Presencial</SelectItem>
                                    <SelectItem value="telehealth">Online</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-notes" className="text-right">
                            Notas
                        </Label>
                        <div className="col-span-3">
                            <Textarea
                                id="edit-notes"
                                placeholder="Observações sobre o agendamento..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-20"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

