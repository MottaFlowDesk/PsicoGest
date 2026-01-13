"use client";

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO, setHours, setMinutes, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Appointment } from "./calendar-view-manager";

export function WeekGrid({ appointments, currentDate, availability, view = 'week' }: { appointments: Appointment[], currentDate: Date, availability: any[], view?: 'week' | 'day' }) {
    const startDate = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 0 }) : startOfDay(currentDate);
    const endDate = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 0 }) : startOfDay(currentDate);

    // If day view, just one day. If week view, 7 days.
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

    const getAvailabilityBlocks = (day: Date) => {
        const dayOfWeek = day.getDay();
        const dayConfig = availability?.find((a: any) => a.day_of_week === dayOfWeek);

        if (!dayConfig) {
            // No availability config = fully unavailable (or fully available depending on logic, usually unavailable)
            return [{ start: 0, end: 100 }]; // 100% height gray
        }

        const blocks = [];
        const dayStartMinutes = 8 * 60; // 08:00 in minutes
        const dayEndMinutes = 21 * 60; // 21:00 end of view grid

        // Parse DB times (HH:MM:SS)
        const [startH, startM] = dayConfig.start_time.split(':').map(Number);
        const [endH, endM] = dayConfig.end_time.split(':').map(Number);

        const configStartMinutes = startH * 60 + startM;
        const configEndMinutes = endH * 60 + endM;

        const totalViewMinutes = 13 * 60;

        // Block before start
        if (configStartMinutes > dayStartMinutes) {
            const height = ((configStartMinutes - dayStartMinutes) / totalViewMinutes) * 100;
            blocks.push({ top: 0, height, key: 'morning-block' });
        }

        // Block after end
        if (configEndMinutes < dayEndMinutes) {
            const minutesFromTop = configEndMinutes - dayStartMinutes;
            const top = (minutesFromTop / totalViewMinutes) * 100;
            const height = 100 - top;
            blocks.push({ top, height, key: 'evening-block' });
        }

        return blocks;
    };

    // Calculate grid height: Day view gets expanded height (120px per hour), Week view fits screen or min 600px
    const hourHeight = view === 'day' ? 120 : null; // 120px per hour for day view
    const totalHours = 13; // 8 to 20 = 13 slots
    const totalGridHeight = hourHeight ? totalHours * hourHeight : '100%';

    return (
        <div className="flex flex-col h-full bg-white relative overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[50px_1fr] border-b border-slate-100 sticky top-0 bg-white z-20 shadow-sm">
                <div className="border-r border-slate-100 p-2 text-[10px] text-slate-400 text-center pt-4">Time</div>
                <div className={cn(
                    "grid divide-slate-100",
                    view === 'week' ? "grid-cols-7 divide-x" : "grid-cols-1"
                )}>
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

            {/* Scrollable Timetable Area */}
            <div className="flex-1 min-h-0 overflow-y-auto relative custom-scrollbar">
                <div className="grid grid-cols-[50px_1fr] relative" style={{ height: typeof totalGridHeight === 'number' ? `${totalGridHeight}px` : totalGridHeight }}>

                    {/* Time labels column */}
                    <div className="border-r border-slate-100 bg-slate-50/10 relative">
                        {hours.map((hour, index) => (
                            <div
                                key={hour}
                                className="absolute w-full text-[10px] text-slate-400 text-right pr-2 -mt-1.5"
                                style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
                            >
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    <div className={cn(
                        "grid divide-slate-100 relative h-full",
                        view === 'week' ? "grid-cols-7 divide-x" : "grid-cols-1"
                    )}>
                        {/* Horizontal Guidelines */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            {hours.map((hour, index) => (
                                <div
                                    key={hour}
                                    className="absolute w-full border-b border-slate-50 last:border-0"
                                    style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
                                />
                            ))}
                        </div>

                        {days.map(day => {
                            const dayApps = appointments.filter(app => isSameDay(parseISO(app.scheduled_at), day));
                            const availabilityBlocks = getAvailabilityBlocks(day);
                            const isFullyUnavailable = availabilityBlocks.length === 1 && 'start' in availabilityBlocks[0] && availabilityBlocks[0].start === 0;

                            return (
                                <div key={day.toString()} className={cn(
                                    "relative h-full",
                                    isToday(day) ? "bg-blue-50/5" : "bg-white"
                                )}>
                                    {/* Availability Blocks (Gray areas) */}
                                    {isFullyUnavailable ? (
                                        <div className="absolute inset-0 bg-slate-100 z-0 flex items-center justify-center border border-slate-200">
                                            <span className={cn(
                                                "text-slate-400 font-medium select-none transform",
                                                view === 'week' ? "text-xs -rotate-90" : "text-sm rotate-0"
                                            )}>Indisponível</span>
                                        </div>
                                    ) : (
                                        availabilityBlocks.map((block: any) => (
                                            <div
                                                key={block.key}
                                                className="absolute left-0 right-0 bg-slate-100 z-0 border-y border-slate-200"
                                                style={{ top: `${block.top}%`, height: `${block.height}%` }}
                                            />
                                        ))
                                    )}

                                    {dayApps.map(app => (
                                        <div
                                            key={app.id}
                                            style={getAppointmentStyle(app)}
                                            className={cn(
                                                "absolute rounded px-3 py-2 text-xs border overflow-hidden shadow-sm z-10 hover:z-20 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-center",
                                                view === 'week' ? "left-0.5 right-0.5 px-1.5 py-0.5" : "left-4 right-4",
                                                app.status === 'confirmed' ? "bg-green-100 border-green-300 text-green-800" :
                                                    app.status === 'cancelled' ? "bg-red-100 border-red-300 text-red-800 line-through opacity-80" :
                                                        app.status === 'completed' ? "bg-slate-100 border-slate-300 text-slate-700 opacity-90" :
                                                            app.status === 'no_show' ? "bg-orange-100 border-orange-300 text-orange-800" :
                                                                "bg-blue-50 border-blue-200 text-blue-700"
                                            )}
                                        >
                                            <div className={cn("font-semibold truncate leading-tight", view === 'day' && "text-sm")}>{app.patients?.full_name}</div>
                                            {view === 'day' && (
                                                <div className="text-xs opacity-80 mt-1 flex gap-2">
                                                    <span>{format(parseISO(app.scheduled_at), "HH:mm")}</span>
                                                    <span>•</span>
                                                    <span>{app.type === 'telehealth' ? 'Online' : 'Presencial'}</span>
                                                </div>
                                            )}
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
        </div>
    );
}
