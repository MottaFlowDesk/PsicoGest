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
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PatientOption {
    id: string;
    full_name: string;
}

import { useRouter } from "next/navigation";

export function NewAppointmentDialog({ onAppointmentCreated }: { onAppointmentCreated?: () => void }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const router = useRouter();

    // Form state
    const [patientId, setPatientId] = useState("");
    const [date, setDate] = useState<Date>();
    const [time, setTime] = useState("09:00");
    const [duration, setDuration] = useState("50");
    const [type, setType] = useState("in_person");

    const supabase = createClient();

    useEffect(() => {
        if (open) {
            fetchPatients();
        }
    }, [open]);

    const fetchPatients = async () => {
        const { data } = await supabase
            .from("patients")
            .select("id, full_name")
            .order("full_name");

        if (data) setPatients(data);
    };

    const handleSubmit = async () => {
        if (!patientId || !date || !time) return;

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get professional ID
            const { data: professional } = await supabase
                .from("professionals")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!professional) throw new Error("Professional not found");

            // Construct timestamp
            // Date + Time string to Date object
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledAt = new Date(date);
            scheduledAt.setHours(hours, minutes, 0, 0);

            const { error } = await supabase.from("appointments").insert({
                professional_id: professional.id,
                patient_id: patientId,
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: parseInt(duration),
                type: type,
                telehealth_provider: type === 'telehealth' ? 'native' : null,
                status: 'scheduled',
                timezone: 'America/Sao_Paulo'
            });

            if (error) throw error;

            setOpen(false);
            onAppointmentCreated?.();
            router.refresh(); // Refresh server data
            resetForm();

        } catch (error: any) {
            console.error("Error creating appointment:", JSON.stringify(error, null, 2));
            alert(`Erro ao criar agendamento: ${error.message || "Erro desconhecido"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setPatientId("");
        setDate(undefined);
        setTime("09:00");
        setDuration("50");
        setType("in_person");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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

                    {/* Date Picker (Native for MVP simplicity or Shadcn Calendar) */}
                    {/* Let's try native date input first for robustness if calendar component is missing */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Data
                        </Label>
                        <div className="col-span-3">
                            <Input
                                type="date"
                                id="date"
                                onChange={(e) => setDate(e.target.valueAsDate || undefined)}
                                className="block"
                            />
                        </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">Horário</Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                type="time"
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
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !patientId || !date}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Agendar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
