"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WeeklySchedulerProps {
    professionalId: string;
}

interface DaySchedule {
    day_of_week: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
    id?: string;
}

const DAYS = [
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
    { value: 0, label: "Domingo" },
];

export function WeeklyScheduler({ professionalId }: WeeklySchedulerProps) {
    const [schedule, setSchedule] = useState<DaySchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("professional_availability")
            .select("*")
            .eq("professional_id", professionalId);

        // Initialize schedule for all days
        const initialized: DaySchedule[] = DAYS.map(d => {
            const existing = data?.find((item: any) => item.day_of_week === d.value);
            return {
                day_of_week: d.value,
                enabled: !!existing,
                start_time: existing?.start_time?.slice(0, 5) || "09:00",
                end_time: existing?.end_time?.slice(0, 5) || "18:00",
                id: existing?.id
            };
        });

        setSchedule(initialized);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const activeDays = schedule.filter(s => s.enabled);
            const disabledDays = schedule.filter(s => !s.enabled && s.id);

            // Delete disabled days
            if (disabledDays.length > 0) {
                const { error: deleteError } = await supabase
                    .from("professional_availability")
                    .delete()
                    .in("id", disabledDays.map(d => d.id!));

                if (deleteError) {
                    console.error("Delete error:", deleteError);
                    throw new Error(`Erro ao remover dias: ${deleteError.message}`);
                }
            }

            // Upsert enabled days
            for (const day of activeDays) {
                // Ensure time format is HH:MM:SS for PostgreSQL
                const startTime = day.start_time.length === 5 ? `${day.start_time}:00` : day.start_time;
                const endTime = day.end_time.length === 5 ? `${day.end_time}:00` : day.end_time;

                if (day.id) {
                    // Update existing
                    const { error: updateError } = await supabase
                        .from("professional_availability")
                        .update({
                            start_time: startTime,
                            end_time: endTime
                        })
                        .eq("id", day.id);

                    if (updateError) {
                        console.error("Update error:", updateError);
                        throw new Error(`Erro ao atualizar: ${updateError.message}`);
                    }
                } else {
                    // Insert new
                    const { error: insertError } = await supabase
                        .from("professional_availability")
                        .insert({
                            professional_id: professionalId,
                            day_of_week: day.day_of_week,
                            start_time: startTime,
                            end_time: endTime
                        });

                    if (insertError) {
                        console.error("Insert error:", insertError);
                        throw new Error(`Erro ao adicionar: ${insertError.message}`);
                    }
                }
            }

            toast.success("Disponibilidade salva com sucesso!");
            await fetchAvailability(); // Refresh to get new IDs
        } catch (error: any) {
            console.error("Error saving availability:", error);
            toast.error(error.message || "Erro ao salvar disponibilidade");
        } finally {
            setSaving(false);
        }
    };

    const updateDay = (dayValue: number, updates: Partial<DaySchedule>) => {
        setSchedule(prev => prev.map(d => d.day_of_week === dayValue ? { ...d, ...updates } : d));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
                <p className="text-slate-500">Carregando horários...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="space-y-4">
                {DAYS.map((day) => {
                    const current = schedule.find(s => s.day_of_week === day.value)!;

                    return (
                        <div key={day.value} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-4 w-40">
                                <Switch
                                    checked={current.enabled}
                                    onCheckedChange={(c: boolean) => updateDay(day.value, { enabled: c })}
                                />
                                <span className={cn("text-sm font-medium", current.enabled ? "text-slate-900" : "text-slate-400")}>
                                    {day.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {current.enabled ? (
                                    <>
                                        <Input
                                            type="time"
                                            className="w-24"
                                            value={current.start_time}
                                            onChange={(e) => updateDay(day.value, { start_time: e.target.value })}
                                        />
                                        <span className="text-slate-400">-</span>
                                        <Input
                                            type="time"
                                            className="w-24"
                                            value={current.end_time}
                                            onChange={(e) => updateDay(day.value, { end_time: e.target.value })}
                                        />
                                    </>
                                ) : (
                                    <span className="text-sm text-slate-400 italic px-4">Indisponível</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Horários
                </Button>
            </div>
        </div>
    );
}
