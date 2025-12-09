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
    availability: any[];
}

export function CalendarViewManager({ appointments, availability }: CalendarViewManagerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get("date");
    const viewParam = searchParams.get("view") as "month" | "week" | "day" || "month";

    const currentDate = dateParam ? parseISO(dateParam) : new Date();

    const handleNavigate = (direction: "prev" | "next") => {
        let newDate = new Date(currentDate);
        if (viewParam === "month") {
            newDate = direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
        } else if (viewParam === "week") {
            newDate = direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1);
        } else {
            // Day view
            newDate = direction === "prev" ? subWeeks(currentDate, 0.14) : addWeeks(currentDate, 0.14); // +/- 1 day approximation logic or just use addDays
            newDate.setDate(currentDate.getDate() + (direction === "prev" ? -1 : 1));
        }
        updateUrl(newDate, viewParam);
    };

    const handleToday = () => {
        updateUrl(new Date(), viewParam);
    };

    const handleViewChange = (view: string) => {
        if (!view) return;
        updateUrl(currentDate, view as "month" | "week" | "day");
    };

    const updateUrl = (date: Date, view: "month" | "week" | "day") => {
        const isoDate = format(date, "yyyy-MM-dd");
        router.push(`/dashboard/calendar?date=${isoDate}&view=${view}`);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                        <button onClick={() => handleNavigate("prev")} className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-l-lg border-r border-slate-200 transition-colors">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={handleToday} className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                            Hoje
                        </button>
                        <button onClick={() => handleNavigate("next")} className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-r-lg border-l border-slate-200 transition-colors">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => handleViewChange("month")}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewParam === 'month'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => handleViewChange("week")}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewParam === 'week'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => handleViewChange("day")}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewParam === 'day'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            Dia
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {viewParam === "month" ? (
                    <MonthGrid appointments={appointments} currentDate={currentDate} />
                ) : (
                    <WeekGrid
                        appointments={appointments}
                        currentDate={currentDate}
                        availability={availability}
                        view={viewParam}
                    />
                )}
            </div>
        </div>
    );
}
