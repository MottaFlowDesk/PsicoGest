"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Video, MapPin, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Appointment {
    id: string;
    scheduled_at: string;
    type: "in_person" | "telehealth";
    status: string;
    patients: {
        full_name: string;
    };
}

interface CalendarMonthViewProps {
    appointments: Appointment[];
    currentDate: Date;
}

export function CalendarMonthView({ appointments, currentDate }: CalendarMonthViewProps) {
    const router = useRouter();
    // We navigate via URL to keep server state in sync
    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
        const isoDate = format(newDate, "yyyy-MM-dd");
        router.push(`/dashboard/calendar?date=${isoDate}`);
    };

    const handleToday = () => {
        const isoDate = format(new Date(), "yyyy-MM-dd");
        router.push(`/dashboard/calendar?date=${isoDate}`);
    };

    // Calculate calendar grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    // Status colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return "bg-green-100 text-green-800 border-green-300";
            case 'completed': return "bg-slate-100 text-slate-700 border-slate-300 line-through decoration-slate-400 opacity-90";
            case 'cancelled': return "bg-red-100 text-red-800 border-red-300 line-through decoration-red-400 opacity-80";
            case 'no_show': return "bg-orange-100 text-orange-800 border-orange-300";
            default: return "bg-blue-50 text-blue-700 border-blue-200"; // scheduled
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="h-3 w-3" />;
            case 'cancelled': return <XCircle className="h-3 w-3" />;
            case 'no_show': return <AlertCircle className="h-3 w-3" />;
            default: return <Clock className="h-3 w-3" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold capitalize text-slate-900">
                        {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                    </h2>
                    <div className="flex items-center border rounded-md bg-slate-50">
                        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("prev")} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 text-xs font-medium border-x border-slate-200 rounded-none">
                            Hoje
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMonthChange("next")} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Legend/Filters could go here */}
                <div className="text-xs text-slate-500 flex gap-3">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Agendado</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Confirmado</div>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {days.map((day, dayIdx) => {
                    const dayAppointments = appointments.filter(app => isSameDay(parseISO(app.scheduled_at), day));
                    // Sort by time
                    dayAppointments.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[120px] p-2 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50/50",
                                !isSameMonth(day, currentDate) && "bg-slate-50 text-slate-400",
                                isToday(day) && "bg-blue-50/30"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                    isToday(day) ? "bg-blue-600 text-white" : "text-slate-700"
                                )}>
                                    {format(day, "d")}
                                </span>
                                {dayAppointments.length > 0 && (
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {dayAppointments.length} agenda{dayAppointments.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                {dayAppointments.map((app) => (
                                    <TooltipProvider key={app.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-1 rounded border flex items-center gap-1.5 cursor-pointer truncate transition-all hover:opacity-80 hover:shadow-sm",
                                                        getStatusColor(app.status)
                                                    )}
                                                >
                                                    {getStatusIcon(app.status)}
                                                    <span className="font-semibold tabular-nums">
                                                        {format(parseISO(app.scheduled_at), "HH:mm")}
                                                    </span>
                                                    <span className="truncate flex-1">
                                                        {app.patients?.full_name?.split(' ')[0]}
                                                    </span>
                                                    {app.type === 'telehealth' && <Video className="h-3 w-3 opacity-70" />}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="p-3 max-w-xs">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm">{app.patients?.full_name}</p>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(app.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 capitalize">
                                                        {app.type === 'telehealth' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                                        {app.type === 'telehealth' ? 'Teleconsulta' : 'Presencial'}
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-border flex justify-between items-center text-xs">
                                                        <span className="capitalize text-slate-500">{app.status}</span>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
