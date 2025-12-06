"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter, useSearchParams } from "next/navigation";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekGrid } from "@/components/calendar/week-grid";

export type Appointment = {
    id: string;
    scheduled_at: string; // ISO
    type: "in_person" | "telehealth";
    status: string;
    patients: {
        full_name: string;
    };
    duration_minutes: number;
};

interface CalendarViewManagerProps {
    appointments: Appointment[];
}

export function CalendarViewManager({ appointments }: CalendarViewManagerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get("date");
    const viewParam = searchParams.get("view") as "month" | "week" || "month";

    const currentDate = dateParam ? parseISO(dateParam) : new Date();

    const handleNavigate = (direction: "prev" | "next") => {
        let newDate = new Date(currentDate);
        if (viewParam === "month") {
            newDate = direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
        } else {
            newDate = direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
        }
        updateUrl(newDate, viewParam);
    };

    const handleToday = () => {
        updateUrl(new Date(), viewParam);
    };

    const handleViewChange = (view: string) => {
        if (!view) return;
        updateUrl(currentDate, view as "month" | "week");
    };

    const updateUrl = (date: Date, view: "month" | "week") => {
        const isoDate = format(date, "yyyy-MM-dd");
        router.push(`/dashboard/calendar?date=${isoDate}&view=${view}`);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold capitalize text-slate-900 w-48">
                        {viewParam === 'month'
                            ? format(currentDate, "MMMM yyyy", { locale: ptBR })
                            : `Semana ${format(currentDate, "w")} · ${format(currentDate, "MMMM", { locale: ptBR })}`
                        }
                    </h2>
                    <div className="flex items-center border rounded-md bg-slate-50">
                        <Button variant="ghost" size="icon" onClick={() => handleNavigate("prev")} className="h-8 w-8 text-slate-600">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 text-xs font-medium border-x border-slate-200 rounded-none text-slate-600">
                            Hoje
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleNavigate("next")} className="h-8 w-8 text-slate-600">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ToggleGroup type="single" value={viewParam} onValueChange={handleViewChange} className="border rounded-md p-0.5 bg-slate-50">
                        <ToggleGroupItem value="month" className="h-7 px-3 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            Mês
                        </ToggleGroupItem>
                        <ToggleGroupItem value="week" className="h-7 px-3 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm">
                            <List className="mr-2 h-3 w-3" />
                            Semana
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {viewParam === "month" ? (
                    <MonthGrid appointments={appointments} currentDate={currentDate} />
                ) : (
                    <WeekGrid appointments={appointments} currentDate={currentDate} />
                )}
            </div>
        </div>
    );
}
