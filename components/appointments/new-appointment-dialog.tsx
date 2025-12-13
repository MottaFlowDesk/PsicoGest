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

interface PatientOption {
    id: string;
    full_name: string;
}

interface RecurrenceConfig {
    enabled: boolean;
    frequency: "weekly" | "biweekly" | "monthly";
    occurrences: number;
}

interface NewAppointmentDialogProps {
    onAppointmentCreated?: () => void;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    defaultPatientId?: string;
    triggerLabel?: string;
}

export function NewAppointmentDialog(props: NewAppointmentDialogProps) {
    const {
        onAppointmentCreated,
        className,
        variant,
        defaultPatientId,
        triggerLabel = "Novo Agendamento"
    } = props;

    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [professionalId, setProfessionalId] = useState<string | null>(null);
    const router = useRouter();

    const [patientId, setPatientId] = useState(defaultPatientId || "");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState("50");
    const [type, setType] = useState("in_person");
    const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
        enabled: false,
        frequency: "weekly",
        occurrences: 8,
    });

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

    async function fetchProfessionalId() {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data } = await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", userData.user.id)
            .single();

        if (data) setProfessionalId(data.id);
    }

    async function fetchPatients() {
        const { data } = await supabase
            .from("patients")
            .select("id, full_name")
            .eq("archived", false)
            .order("full_name");

        if (data) setPatients(data);
    }

    async function fetchAvailableSlots() {
        if (!date || !professionalId) return;

        setLoadingSlots(true);
        try {
            const slots = await getAvailableSlots(
                professionalId,
                date,
                parseInt(duration)
            );
            setAvailableSlots(slots);
            
            if (time && !slots.find(s => s.start === time)) {
                setTime("");
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }

    async function handleSubmit() {
        if (!patientId || !date || !time) return;

        setIsLoading(true);
        try {
            const datesToCreate: Date[] = [date];
            
            if (recurrence.enabled) {
                let currentDate = date;
                for (let i = 1; i < recurrence.occurrences; i++) {
                    if (recurrence.frequency === "weekly") {
                        currentDate = addWeeks(currentDate, 1);
                    } else if (recurrence.frequency === "biweekly") {
                        currentDate = addWeeks(currentDate, 2);
                    } else {
                        currentDate = addMonths(currentDate, 1);
                    }
                    datesToCreate.push(new Date(currentDate));
                }
            }

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
                    console.error("Failed to create appointment:", err);
                }
            }

            if (created > 0) {
                const message = recurrence.enabled 
                    ? `${created} agendamento(s) criado(s)!${failed > 0 ? ` (${failed} falharam)` : ''}`
                    : "Agendamento criado com sucesso!";
                toast.success(message);
            } else {
                toast.error("Não foi possível criar os agendamentos");
            }

            setOpen(false);
            if (onAppointmentCreated) onAppointmentCreated();
            router.refresh();
            resetForm();

        } catch (error: unknown) {
            console.error("Error creating appointment:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro ao criar agendamento";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    function resetForm() {
        setPatientId(defaultPatientId || "");
        setDate(undefined);
        setTime("");
        setDuration("50");
        setType("in_person");
        setAvailableSlots([]);
        setRecurrence({ enabled: false, frequency: "weekly", occurrences: 8 });
    }

    function handleOpenChange(isOpen: boolean) {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
                                                className={time === slot.start 
                                                    ? "bg-brand-600 hover:bg-brand-700" 
                                                    : "hover:bg-brand-50 hover:border-brand-300"
                                                }
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

                    <div className="border-t border-slate-200 pt-4 mt-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <Label className="font-medium">Repetir agendamento</Label>
                                <p className="text-xs text-slate-500">Cria múltiplos agendamentos</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={recurrence.enabled}
                                onChange={(e) => setRecurrence({ ...recurrence, enabled: e.target.checked })}
                                className="h-4 w-4"
                            />
                        </div>
                        
                        {recurrence.enabled && (
                            <div className="mt-3 space-y-3 pl-4 border-l-2 border-brand-200">
                                <div className="flex items-center gap-2">
                                    <Select 
                                        value={recurrence.frequency} 
                                        onValueChange={(v: "weekly" | "biweekly" | "monthly") => 
                                            setRecurrence({ ...recurrence, frequency: v })
                                        }
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="weekly">Semanal</SelectItem>
                                            <SelectItem value="biweekly">Quinzenal</SelectItem>
                                            <SelectItem value="monthly">Mensal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-slate-500">por</span>
                                    <Input
                                        type="number"
                                        min={2}
                                        max={52}
                                        value={recurrence.occurrences}
                                        onChange={(e) => setRecurrence({ ...recurrence, occurrences: parseInt(e.target.value) || 2 })}
                                        className="w-16 h-9 text-center"
                                    />
                                    <span className="text-sm text-slate-500">sessões</span>
                                </div>
                            </div>
                        )}
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
                        {recurrence.enabled ? `Criar ${recurrence.occurrences} Agendamentos` : 'Agendar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
