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
        const totalMinutes = 13 * 60; // 13 hours total
        const minutesFromStart = differenceInMinutes(start, dayStart);
        const duration = app.duration_minutes || 50;

        const top = (minutesFromStart / totalMinutes) * 100;
        const height = (duration / totalMinutes) * 100;

        return {
            top: `${top}%`,
            height: `${height}%`,
        };
    };

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[50px_1fr] border-b border-slate-100 sticky top-0 bg-white z-20">
                <div className="border-r border-slate-100 p-2 text-[10px] text-slate-400 text-center pt-4">Time</div>
                <div className="grid grid-cols-7 divide-x divide-slate-100">
                    {days.map(day => (
                        <div key={day.toString()} className={cn(
                            "p-2 text-center",
                            isToday(day) && "bg-blue-50/30"
                        )}>
                            <div className="text-[10px] font-medium text-slate-500 uppercase">{format(day, "EEE", { locale: ptBR })}</div>
                            <div className={cn(
                                "text-sm font-semibold w-6 h-6 rounded-full flex items-center justify-center mx-auto mt-0.5",
                                isToday(day) ? "bg-blue-600 text-white" : "text-slate-900"
                            )}>
                                {format(day, "d")}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timetable */}
            <div className="grid grid-cols-[50px_1fr] flex-1 min-h-0 relative">
                {/* Time labels */}
                <div className="border-r border-slate-100 bg-slate-50/10 flex flex-col justify-between py-2">
                    {hours.map(hour => (
                        <div key={hour} className="text-[10px] text-slate-300 text-right pr-2">
                            {hour}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="grid grid-cols-7 divide-x divide-slate-100 relative h-full">
                    {/* Horizontal Guidelines */}
                    <div className="absolute inset-0 z-0 pointer-events-none flex flex-col justify-between py-2">
                        {hours.map(hour => (
                            <div key={hour} className="border-b border-slate-50 w-full h-px last:border-0" />
                        ))}
                    </div>

                    {days.map(day => {
                        const dayApps = appointments.filter(app => isSameDay(parseISO(app.scheduled_at), day));

                        return (
                            <div key={day.toString()} className={cn(
                                "relative h-full",
                                isToday(day) && "bg-blue-50/5"
                            )}>
                                {dayApps.map(app => (
                                    <div
                                        key={app.id}
                                        style={getAppointmentStyle(app)}
                                        className={cn(
                                            "absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-[10px] border overflow-hidden shadow-sm z-10 hover:z-20 hover:scale-[1.02] transition-all cursor-pointer",
                                            app.status === 'confirmed' ? "bg-green-100 border-green-200 text-green-800" :
                                                app.status === 'cancelled' ? "bg-red-50 border-red-100 text-red-400 line-through opacity-60" :
                                                    "bg-blue-50 border-blue-200 text-blue-700"
                                        )}
                                    >
                                        <div className="font-semibold truncate leading-tight">{app.patients?.full_name?.split(' ')[0]}</div>
                                    </div>
                                ))}

                                {/* Current time indicator if today */}
                                {isToday(day) && (
                                    <div
                                        className="absolute w-full border-t border-red-400 z-30 pointer-events-none opacity-50"
                                        style={{ top: `${(differenceInMinutes(new Date(), setHours(startOfDay(new Date()), 8)) / (13 * 60)) * 100}%` }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full -ml-[3px] -mt-[3px]" />
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
