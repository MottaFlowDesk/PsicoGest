"use client";

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO, setHours, setMinutes, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Appointment } from "./calendar-view-manager";

export function WeekGrid({ appointments, currentDate }: { appointments: Appointment[], currentDate: Date }) {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

    const getAppointmentStyle = (app: Appointment) => {
        const start = parseISO(app.scheduled_at);
        const dayStart = setHours(startOfDay(start), 8); // Base 08:00
        const minutesFromStart = differenceInMinutes(start, dayStart);
        const duration = app.duration_minutes || 50;

        // 1 hour = 60px height (arbitrary scale)
        const top = (minutesFromStart / 60) * 60;
        const height = (duration / 60) * 60;

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    return (
        <div className="flex flex-col h-full min-h-[800px] overflow-auto relative">
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr] border-b border-slate-100 sticky top-0 bg-white z-20">
                <div className="border-r border-slate-100 p-2 text-xs text-slate-400 text-center pt-8">GMT-3</div>
                <div className="grid grid-cols-7">
                    {days.map(day => (
                        <div key={day.toString()} className={cn(
                            "p-2 text-center border-r border-slate-100 last:border-r-0",
                            isToday(day) && "bg-blue-50/30"
                        )}>
                            <div className="text-xs font-medium text-slate-500 uppercase">{format(day, "EEE", { locale: ptBR })}</div>
                            <div className={cn(
                                "text-lg font-semibold w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1",
                                isToday(day) ? "bg-blue-600 text-white" : "text-slate-900"
                            )}>
                                {format(day, "d")}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timetable */}
            <div className="grid grid-cols-[60px_1fr] flex-1">
                {/* Time labels */}
                <div className="border-r border-slate-100 bg-slate-50/30">
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] text-xs text-slate-400 text-right pr-2 pt-1 border-b border-transparent relative">
                            <span className="-top-3 relative">{hour}:00</span>
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="grid grid-cols-7 relative">
                    {/* Horizontal Guidelines */}
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] border-b border-slate-100 w-full" />
                        ))}
                    </div>

                    {days.map(day => {
                        const dayApps = appointments.filter(app => isSameDay(parseISO(app.scheduled_at), day));

                        return (
                            <div key={day.toString()} className={cn(
                                "relative border-r border-slate-100 last:border-r-0 h-[780px]", // 13 hours * 60px
                                isToday(day) && "bg-blue-50/10"
                            )}>
                                {dayApps.map(app => (
                                    <div
                                        key={app.id}
                                        style={getAppointmentStyle(app)}
                                        className={cn(
                                            "absolute left-1 right-1 rounded px-2 py-1 text-xs border overflow-hidden shadow-sm z-10 hover:z-20 transition-all",
                                            app.status === 'confirmed' ? "bg-green-100 border-green-200 text-green-800" :
                                                app.status === 'cancelled' ? "bg-red-50 border-red-100 text-red-400 line-through decoration-red-300 opacity-60" :
                                                    "bg-blue-50 border-blue-200 text-blue-700"
                                        )}
                                    >
                                        <div className="font-semibold truncate">{app.patients?.full_name}</div>
                                        <div className="opacity-80 text-[10px]">{format(parseISO(app.scheduled_at), "HH:mm")}</div>
                                    </div>
                                ))}

                                {/* Current time indicator if today */}
                                {isToday(day) && (
                                    <div
                                        className="absolute w-full border-t-2 border-red-400 z-30 pointer-events-none"
                                        style={{ top: `${(differenceInMinutes(new Date(), setHours(startOfDay(new Date()), 8)) / 60) * 60}px` }}
                                    >
                                        <div className="w-2 h-2 bg-red-400 rounded-full -ml-1 -mt-[5px]" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
