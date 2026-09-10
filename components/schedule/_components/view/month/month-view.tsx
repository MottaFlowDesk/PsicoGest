"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { useScheduler } from "@/providers/schedular-provider";
import { useModal } from "@/providers/modal-context";
import { Event, CustomEventModal } from "@/types";
import AppointmentDetailsModal from "@/components/schedule/_modals/appointment-details-modal";
import { DayAgendaDialog } from "@/components/schedule/_modals/day-agenda-dialog";

const MAX_VISIBLE_EVENTS = 2;

function chipColor(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-100 text-green-800 border-green-200";
        case "cancelled":
            return "bg-red-100 text-red-800 border-red-200";
        case "completed":
            return "bg-slate-100 text-slate-600 border-slate-200";
        case "no_show":
            return "bg-orange-100 text-orange-800 border-orange-200";
        default:
            return "bg-blue-50 text-blue-700 border-blue-200";
    }
}

/** Occupancy is a secondary cue, not the view. Keep it readable. */
function occupancyClass(count: number, isToday: boolean) {
    if (isToday) return "bg-blue-50 ring-1 ring-inset ring-blue-400";
    if (count === 0) return "bg-white";
    if (count === 1) return "bg-sky-50";
    if (count <= 3) return "bg-sky-100";
    if (count <= 5) return "bg-sky-200/80";
    return "bg-sky-300/80";
}

export default function MonthView({
    CustomEventComponent: _CustomEventComponent,
    CustomEventModal: _CustomEventModal,
    currentDate: currentDateProp,
}: {
    prevButton?: React.ReactNode;
    nextButton?: React.ReactNode;
    CustomEventComponent?: React.FC<Event>;
    CustomEventModal?: CustomEventModal;
    classNames?: { prev?: string; next?: string; addEvent?: string };
    currentDate?: Date;
}) {
    const { getters, weekStartsOn } = useScheduler();
    const { setOpen } = useModal();
    const [internalDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<{ date: Date; events: Event[] } | null>(null);

    const currentDate = currentDateProp ?? internalDate;

    const daysInMonth = getters.getDaysInMonth(
        currentDate.getMonth(),
        currentDate.getFullYear()
    );

    const daysOfWeek =
        weekStartsOn === "monday"
            ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
            : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    );

    const startOffset =
        (firstDayOfMonth.getDay() - (weekStartsOn === "monday" ? 1 : 0) + 7) % 7;

    const prevMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
    );
    const lastDateOfPrevMonth = new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth() + 1,
        0
    ).getDate();

    const trailingCount = (7 - ((startOffset + daysInMonth.length) % 7)) % 7;

    const today = new Date();
    const isToday = (day: number) =>
        today.getDate() === day &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();

    const openDay = (day: number, events: Event[]) => {
        setSelectedDay({
            date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
            events,
        });
    };

    const openAppointment = (event: Event, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(<AppointmentDetailsModal event={event} />);
    };

    return (
        <div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {daysOfWeek.map((day) => (
                    <div
                        key={day}
                        className="py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-600"
                    >
                        {day}
                    </div>
                ))}

                {Array.from({ length: startOffset }).map((_, idx) => (
                    <div
                        key={`offset-${idx}`}
                        className="h-[150px] rounded-lg border border-transparent bg-slate-50/60 p-2 text-slate-300"
                    >
                        <span className="text-sm">
                            {lastDateOfPrevMonth - startOffset + idx + 1}
                        </span>
                    </div>
                ))}

                {daysInMonth.map((dayObj) => {
                    const dayEvents = getters
                        .getEventsForDay(dayObj.day, currentDate)
                        .slice()
                        .sort(
                            (a, b) =>
                                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                        );
                    const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                    const hidden = dayEvents.length - visible.length;
                    const todayCell = isToday(dayObj.day);

                    return (
                        <button
                            key={dayObj.day}
                            type="button"
                            onClick={() => openDay(dayObj.day, dayEvents)}
                            className={cn(
                                "flex h-[150px] flex-col rounded-lg border border-slate-200 p-2 text-left transition-shadow hover:z-10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                                occupancyClass(dayEvents.length, todayCell)
                            )}
                        >
                            <div className="mb-1 flex items-center justify-between">
                                <span
                                    className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                                        todayCell
                                            ? "bg-blue-600 text-white"
                                            : dayEvents.length > 0
                                              ? "text-slate-800"
                                              : "text-slate-500"
                                    )}
                                >
                                    {dayObj.day}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="text-[10px] font-medium tabular-nums text-slate-500">
                                        {dayEvents.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col gap-1">
                                {visible.map((event) => (
                                    <span
                                        key={event.id}
                                        role="link"
                                        tabIndex={0}
                                        onClick={(e) => openAppointment(event, e)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                openAppointment(event, e as unknown as React.MouseEvent);
                                            }
                                        }}
                                        className={cn(
                                            "block truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight hover:opacity-80",
                                            chipColor(event.metadata?.status)
                                        )}
                                    >
                                        {format(new Date(event.startDate), "HH:mm")}{" "}
                                        {event.title.split(" ")[0]}
                                    </span>
                                ))}
                                {hidden > 0 && (
                                    <span className="text-[10px] font-semibold text-slate-600">
                                        +{hidden} mais
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}

                {Array.from({ length: trailingCount }).map((_, idx) => (
                    <div
                        key={`trail-${idx}`}
                        className="h-[150px] rounded-lg border border-transparent bg-slate-50/60 p-2 text-slate-300"
                    >
                        <span className="text-sm">{idx + 1}</span>
                    </div>
                ))}
            </div>

            <DayAgendaDialog
                date={selectedDay?.date ?? null}
                events={selectedDay?.events ?? []}
                onClose={() => setSelectedDay(null)}
            />
        </div>
    );
}
