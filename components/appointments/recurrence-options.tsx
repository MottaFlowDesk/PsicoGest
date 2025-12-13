"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Repeat } from "lucide-react";
import { format, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface RecurrenceSettings {
    enabled: boolean;
    frequency: "weekly" | "biweekly" | "monthly";
    endType: "occurrences" | "date";
    occurrences: number;
    endDate: Date | null;
}

interface RecurrenceOptionsProps {
    startDate: Date | null;
    settings: RecurrenceSettings;
    onChange: (settings: RecurrenceSettings) => void;
}

export function RecurrenceOptions({ startDate, settings, onChange }: RecurrenceOptionsProps) {
    const updateSettings = (updates: Partial<RecurrenceSettings>) => {
        onChange({ ...settings, ...updates });
    };

    // Calculate preview of occurrences
    const getPreviewDates = (): Date[] => {
        if (!startDate || !settings.enabled) return [];

        const dates: Date[] = [];
        let currentDate = startDate;
        const maxDates = settings.endType === "occurrences" ? settings.occurrences : 12;

        for (let i = 0; i < maxDates; i++) {
            if (settings.endType === "date" && settings.endDate && currentDate > settings.endDate) {
                break;
            }

            dates.push(new Date(currentDate));

            switch (settings.frequency) {
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
        }

        return dates;
    };

    const previewDates = getPreviewDates();

    return (
        <div className="space-y-4 pt-2">
            {/* Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <Repeat className="w-5 h-5 text-brand-600" />
                    <div>
                        <Label htmlFor="recurrence-toggle" className="font-medium">
                            Repetir agendamento
                        </Label>
                        <p className="text-xs text-slate-500">
                            Cria múltiplos agendamentos automaticamente
                        </p>
                    </div>
                </div>
                <Switch
                    id="recurrence-toggle"
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
            </div>

            {settings.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-brand-200 ml-2">
                    {/* Frequency */}
                    <div className="space-y-2">
                        <Label>Frequência</Label>
                        <Select
                            value={settings.frequency}
                            onValueChange={(value: "weekly" | "biweekly" | "monthly") =>
                                updateSettings({ frequency: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="biweekly">Quinzenal</SelectItem>
                                <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* End Type */}
                    <div className="space-y-2">
                        <Label>Terminar</Label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="endType"
                                    checked={settings.endType === "occurrences"}
                                    onChange={() => updateSettings({ endType: "occurrences" })}
                                    className="text-brand-600"
                                />
                                <span className="text-sm">Após</span>
                                <Input
                                    type="number"
                                    min={2}
                                    max={52}
                                    value={settings.occurrences}
                                    onChange={(e) =>
                                        updateSettings({ occurrences: parseInt(e.target.value) || 2 })
                                    }
                                    className="w-16 h-8 text-center"
                                    disabled={settings.endType !== "occurrences"}
                                />
                                <span className="text-sm">sessões</span>
                            </label>

                            <label className="flex items-center gap-3 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="endType"
                                    checked={settings.endType === "date"}
                                    onChange={() => updateSettings({ endType: "date" })}
                                    className="text-brand-600"
                                />
                                <span className="text-sm">Em</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={settings.endType !== "date"}
                                            className="h-8"
                                        >
                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                            {settings.endDate
                                                ? format(settings.endDate, "dd/MM/yyyy")
                                                : "Selecionar data"
                                            }
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={settings.endDate || undefined}
                                            onSelect={(date) => updateSettings({ endDate: date || null })}
                                            disabled={(date) =>
                                                date < new Date() || (startDate ? date < startDate : false)
                                            }
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </label>
                        </div>
                    </div>

                    {/* Preview */}
                    {previewDates.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-slate-500">
                                Prévia ({previewDates.length} sessões)
                            </Label>
                            <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-lg p-2 space-y-1">
                                {previewDates.slice(0, 6).map((date, index) => (
                                    <div
                                        key={index}
                                        className="text-xs text-slate-600 flex items-center gap-2"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium">
                                            {index + 1}
                                        </span>
                                        <span className="capitalize">
                                            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>
                                ))}
                                {previewDates.length > 6 && (
                                    <div className="text-xs text-slate-400 text-center pt-1">
                                        +{previewDates.length - 6} sessões adicionais
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Default settings
export const defaultRecurrenceSettings: RecurrenceSettings = {
    enabled: false,
    frequency: "weekly",
    endType: "occurrences",
    occurrences: 8,
    endDate: null,
};

