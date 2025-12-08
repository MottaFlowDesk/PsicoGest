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
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createManualInvoice } from "@/app/dashboard/financial/actions";

interface PatientOption {
    id: string;
    full_name: string;
}

interface NewInvoiceDialogProps {
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function NewInvoiceDialog({ className, variant }: NewInvoiceDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const router = useRouter();

    // Form state
    const [patientId, setPatientId] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState<string>("");
    const [description, setDescription] = useState("");

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
            .eq("archived", false)
            .order("full_name");

        if (data) setPatients(data);
    };

    const handleSubmit = async () => {
        if (!patientId || !amount || !dueDate) return;

        setIsLoading(true);
        try {
            await createManualInvoice({
                patientId,
                amount: parseFloat(amount),
                dueDate,
                description: description || "Consulta Avulsa" // Default description if empty? Or make required.
            });

            setOpen(false);
            router.refresh();
            resetForm();
        } catch (error: any) {
            console.error("Error creating invoice:", error);
            alert("Erro ao criar fatura. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setPatientId("");
        setAmount("");
        setDueDate("");
        setDescription("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={className} variant={variant}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Fatura
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nova Fatura</DialogTitle>
                    <DialogDescription>
                        Crie uma cobrança manual para um paciente.
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
                                    {patients.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Valor (R$)
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dueDate" className="text-right">
                            Vencimento
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Descrição
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="description"
                                placeholder="Ex: Sessão Terapia"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !patientId || !amount || !dueDate}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Fatura
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
