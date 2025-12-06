"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AvailabilityExceptionsProps {
    professionalId: string;
}

interface Exception {
    id: string;
    date: string;
    reason: string;
    notes?: string;
    all_day: boolean;
}

export function AvailabilityExceptions({ professionalId }: AvailabilityExceptionsProps) {
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDate, setNewDate] = useState("");
    const [newReason, setNewReason] = useState("holiday");
    const [isAdding, setIsAdding] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchExceptions();
    }, []);

    const fetchExceptions = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("availability_overrides")
            .select("*")
            .eq("professional_id", professionalId)
            .gte("date", new Date().toISOString().split('T')[0]) // Only future/today
            .order("date");

        if (data) setExceptions(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newDate) return;
        setIsAdding(true);

        try {
            const { error } = await supabase.from("availability_overrides").insert({
                professional_id: professionalId,
                date: newDate,
                reason: newReason,
                all_day: true
            });

            if (error) throw error;

            setNewDate("");
            fetchExceptions();
        } catch (error) {
            console.error("Error adding exception:", error);
            alert("Erro ao adicionar exceção.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este bloqueio?")) return;

        await supabase.from("availability_overrides").delete().eq("id", id);
        fetchExceptions();
    };

    const reasonLabels: Record<string, string> = {
        holiday: "Feriado",
        vacation: "Férias",
        personal: "Pessoal",
        other: "Outro"
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-end gap-4 mb-6">
                <div className="space-y-2 flex-1">
                    <span className="text-sm font-medium">Data do Bloqueio</span>
                    <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                    />
                </div>
                <div className="space-y-2 w-48">
                    <span className="text-sm font-medium">Motivo</span>
                    <Select value={newReason} onValueChange={setNewReason}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="holiday">Feriado</SelectItem>
                            <SelectItem value="vacation">Férias</SelectItem>
                            <SelectItem value="personal">Pessoal</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAdd} disabled={isAdding || !newDate}>
                    {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                    {!isAdding && <Plus className="h-4 w-4 mr-2" />}
                    Bloquear
                </Button>
            </div>

            <div className="space-y-2">
                {loading ? <p className="text-sm text-slate-500">Carregando...</p> :
                    exceptions.length === 0 ? <p className="text-sm text-slate-500 italic">Nenhuma exceção cadastrada.</p> :
                        exceptions.map(exc => (
                            <div key={exc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-semibold text-slate-700">
                                        {format(new Date(exc.date), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exc.reason === 'holiday' ? 'bg-purple-100 text-purple-700' :
                                            exc.reason === 'vacation' ? 'bg-green-100 text-green-700' :
                                                'bg-slate-200 text-slate-700'
                                        }`}>
                                        {reasonLabels[exc.reason]}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(exc.id)} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
            </div>
        </div>
    );
}
