"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Loader2, Plus, AlertCircle, Clock } from "lucide-react";
import { format, addWeeks, addMonths } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/app/dashboard/appointments/actions";
import { getAvailableSlots, TimeSlot } from "@/lib/availability-utils";
import { RecurrenceOptions, RecurrenceSettings, defaultRecurrenceSettings } from "./recurrence-options";

interface PatientOption {
    id: string;
    full_name: string;
}

interface NewAppointmentDialogProps {
    onAppointmentCreated?: () => void;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    defaultPatientId?: string;
    triggerLabel?: string;
}

export function NewAppointmentDialog({
    onAppointmentCreated,
    className,
    variant,
    defaultPatientId,
    triggerLabel = "Novo Agendamento"
}: NewAppointmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [professionalId, setProfessionalId] = useState<string | null>(null);
    const router = useRouter();

    // Form state
    const [patientId, setPatientId] = useState(defaultPatientId || "");
    const [date, setDate] = useState<Date>();
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState("50");
    const [type, setType] = useState("in_person");
    const [recurrence, setRecurrence] = useState<RecurrenceSettings>(defaultRecurrenceSettings);

    const supabase = createClient();

    useEffect(() => {
        if (open) {
            fetchPatients();
            fetchProfessionalId();
        }
    }, [open]);

    useEffect(() => {
        if (date && professionalId) {
            fetchAvailableSlots();
        } else {
            setAvailableSlots([]);
            setTime("");
        }
    }, [date, duration, professionalId]);

    const fetchProfessionalId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (data) setProfessionalId(data.id);
    };

    const fetchPatients = async () => {
        const { data } = await supabase
            .from("patients")
            .select("id, full_name")
            .eq("archived", false)
            .order("full_name");

        if (data) setPatients(data);
    };

    const fetchAvailableSlots = async () => {
        if (!date || !professionalId) return;

        setLoadingSlots(true);
        try {
            const slots = await getAvailableSlots(
                professionalId,
                date,
                parseInt(duration)
            );
            setAvailableSlots(slots);
            
            // Reset time if previously selected time is not available
            if (time && !slots.find(s => s.start === time)) {
                setTime("");
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSubmit = async () => {
        if (!patientId || !date || !time) return;

        setIsLoading(true);
        try {
            // Calculate all dates for recurrence
            const datesToCreate: Date[] = [date];
            
            if (recurrence.enabled) {
                let currentDate = date;
                const maxOccurrences = recurrence.endType === "occurrences" 
                    ? recurrence.occurrences 
                    : 52; // Max 1 year of weekly appointments

                for (let i = 1; i < maxOccurrences; i++) {
                    switch (recurrence.frequency) {
                        case "weekly":
                            currentDate = addWeeks(currentDate, 1);
                            break;
                        case "biweekly":
                            currentDate = addWeeks(currentDate, 2);
                            break;
                        case "monthly":
                            currentDate = addMonths(currentDate, 1);
                            break;
                    }

                    // Stop if we've passed the end date
                    if (recurrence.endType === "date" && recurrence.endDate && currentDate > recurrence.endDate) {
                        break;
                    }

                    datesToCreate.push(new Date(currentDate));
                }
            }

            // Create all appointments
            let created = 0;
            let failed = 0;

            for (const appointmentDate of datesToCreate) {
                try {
                    const dateStr = format(appointmentDate, "yyyy-MM-dd");
                    await createAppointment({
                        patientId,
                        date: dateStr,
                        time,
                        duration: parseInt(duration),
                        type: type as "in_person" | "telehealth"
                    });
                    created++;
                } catch (err) {
                    failed++;
                    console.error(`Failed to create appointment for ${format(appointmentDate, "dd/MM/yyyy")}:`, err);
                }
            }

            if (created > 0) {
                const message = recurrence.enabled 
                    ? `${created} agendamento(s) criado(s) com sucesso!${failed > 0 ? ` (${failed} falharam por conflito de horário)` : ''}`
                    : "Agendamento criado com sucesso!";
                toast.success(message);
            } else {
                toast.error("Não foi possível criar os agendamentos");
            }

            setOpen(false);
            onAppointmentCreated?.();
            router.refresh();
            resetForm();

        } catch (error: any) {
            console.error("Error creating appointment:", error);
            toast.error(error.message || "Erro ao criar agendamento");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setPatientId(defaultPatientId || "");
        setDate(undefined);
        setTime("");
        setDuration("50");
        setType("in_person");
        setAvailableSlots([]);
        setRecurrence(defaultRecurrenceSettings);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button className={className} variant={variant}>
                    <Plus className="mr-2 h-4 w-4" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                    <DialogDescription>
                        Agende uma sessão com um paciente.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    {/* Patient Select */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="patient" className="text-right">
                            Paciente
                        </Label>
                        <div className="col-span-3">
                            <Select value={patientId} onValueChange={setPatientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Duração</Label>
                        <div className="col-span-3">
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Duração" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="50">50 minutos</SelectItem>
                                    <SelectItem value="60">1 hora</SelectItem>
                                    <SelectItem value="90">1h30</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Data
                        </Label>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                id="date"
                                min={format(new Date(), "yyyy-MM-dd")}
                                onChange={(e) => setDate(e.target.valueAsDate || undefined)}
                                className="block"
                            />
                        </div>
                    </div>

                    {/* Available Time Slots */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Horário</Label>
                        <div className="col-span-3">
                            {!date ? (
                                <p className="text-sm text-slate-500 py-2">
                                    Selecione uma data para ver os horários disponíveis
                                </p>
                            ) : loadingSlots ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Carregando horários...
                                </div>
                            ) : availableSlots.length === 0 ? (
                                <div className="flex items-center gap-2 text-sm text-orange-600 py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Nenhum horário disponível nesta data
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {availableSlots.map((slot) => (
                                            <Button
                                                key={slot.start}
                                                type="button"
                                                variant={time === slot.start ? "default" : "outline"}
                                                size="sm"
                                                className={`${
                                                    time === slot.start 
                                                        ? "bg-brand-600 hover:bg-brand-700" 
                                                        : "hover:bg-brand-50 hover:border-brand-300"
                                                }`}
                                                onClick={() => setTime(slot.start)}
                                            >
                                                <Clock className="h-3 w-3 mr-1" />
                                                {slot.start}
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {availableSlots.length} horário(s) disponível(is)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual time input as fallback */}
                    {date && availableSlots.length === 0 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs text-slate-500">
                                Ou digite:
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-32"
                                    placeholder="HH:MM"
                                />
                            </div>
                        </div>
                    )}

                    {/* Type */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Tipo
                        </Label>
                        <div className="col-span-3">
                            <Select value={type} onValueChange={setType}>
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

                    {/* Recurrence */}
                    <div className="border-t border-slate-200 pt-4 mt-2">
                        <RecurrenceOptions
                            startDate={date || null}
                            settings={recurrence}
                            onChange={setRecurrence}
                        />
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isLoading || !patientId || !date || !time}
                        className="bg-brand-600 hover:bg-brand-700"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {recurrence.enabled 
                            ? `Criar ${recurrence.endType === 'occurrences' ? recurrence.occurrences : 'vários'} Agendamentos`
                            : 'Agendar'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
