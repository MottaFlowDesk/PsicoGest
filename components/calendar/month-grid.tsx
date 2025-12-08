"use client";

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Video, MapPin, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Appointment } from "./calendar-view-manager";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function MonthGrid({ appointments, currentDate }: { appointments: Appointment[], currentDate: Date }) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return "bg-green-100 text-green-700 border-green-200";
            case 'completed': return "bg-slate-100 text-slate-700 border-slate-200 line-through decoration-slate-400 opacity-70";
            case 'cancelled': return "bg-red-50 text-red-400 border-red-100 line-through decoration-red-300 opacity-70";
            case 'no_show': return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-blue-50 text-blue-700 border-blue-100";
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
        <div className="flex flex-col h-full">
            {/* Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {days.map((day) => {
                    const dayAppointments = appointments.filter(app => isSameDay(parseISO(app.scheduled_at), day));
                    dayAppointments.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "p-2 border-b border-r border-slate-100 last:border-r-0 relative group transition-colors hover:bg-slate-50/30 overflow-hidden",
                                !isSameMonth(day, currentDate) && "bg-slate-50/50",
                                isToday(day) && "bg-blue-50/20"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday(day) ? "bg-blue-600 text-white" : "text-slate-700 opacity-70"
                                )}>
                                    {format(day, "d")}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {dayAppointments.map((app) => (
                                    <TooltipProvider key={app.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-1 rounded border flex items-center gap-1.5 cursor-pointer truncate transition-all hover:scale-[1.02] hover:shadow-sm",
                                                        getStatusColor(app.status)
                                                    )}
                                                >
                                                    {getStatusIcon(app.status)}
                                                    <span className="font-bold tabular-nums">
                                                        {format(parseISO(app.scheduled_at), "HH:mm")}
                                                    </span>
                                                    <span className="truncate flex-1">
                                                        {app.patients?.full_name?.split(' ')[0]}
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-3">
                                                <p className="font-bold">{app.patients?.full_name}</p>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {format(parseISO(app.scheduled_at), "HH:mm")} - {app.type === 'telehealth' ? 'Online' : 'Presencial'}
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
