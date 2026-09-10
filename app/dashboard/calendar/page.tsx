"use client";

import SchedulerWrapper from "@/components/schedule/_components/view/schedular-view-filteration";
import { SchedulerProvider } from "@/providers/schedular-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, Calendar as CalendarIcon, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import DailyView from "@/components/schedule/_components/view/day/daily-view";
import WeeklyView from "@/components/schedule/_components/view/week/week-view";
import MonthView from "@/components/schedule/_components/view/month/month-view";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fetchAllCalendarData } from "@/lib/calendar-data";
import { Event } from "@/types";
import { createClient } from "@/lib/supabase/client";
import AppointmentEvent from "@/components/schedule/_components/view/event-component/appointment-event";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAppointmentsRealtime } from "@/hooks/use-appointments-realtime";
import { patchEventWithAppointmentStatus } from "@/lib/calendar/appointment-event-utils";
import { CalendarEventsSync } from "@/components/calendar/calendar-events-sync";

const animationConfig = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, type: "spring", stiffness: 250 } as const,
};

export default function CalendarPage() {
    const [activeView, setActiveView] = useState<string>("day");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [professionalId, setProfessionalId] = useState<string | null>(null);
    const router = useRouter();

    const loadCalendarData = useCallback(
        async (options?: { silent?: boolean }) => {
            if (!professionalId) return;

            if (!options?.silent) setLoading(true);
            try {
                const calendarEvents = await fetchAllCalendarData(
                    professionalId,
                    currentDate,
                    activeView as "day" | "week" | "month"
                );
                setEvents(calendarEvents);
            } catch (error) {
                console.error("Error loading calendar data:", error);
            } finally {
                if (!options?.silent) setLoading(false);
            }
        },
        [professionalId, currentDate, activeView]
    );

    const handleDeleteAppointment = useCallback(
        async (appointmentId: string) => {
            try {
                const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Erro ao cancelar agendamento");
                }
                setEvents((prev) => prev.filter((e) => e.id !== appointmentId));
                toast.success("Agendamento excluído com sucesso");
                router.refresh();
            } catch (error) {
                console.error("Error deleting appointment:", error);
                toast.error(
                    error instanceof Error ? error.message : "Erro ao excluir agendamento"
                );
                throw error;
            }
        },
        [router]
    );

    const handleAppointmentStatusChange = useCallback(
        (appointmentId: string, status: string) => {
            setEvents((prev) =>
                prev.map((event) =>
                    event.id === appointmentId
                        ? patchEventWithAppointmentStatus(event, status)
                        : event
                )
            );
            if (status === "confirmed") {
                toast.success("Paciente confirmou o agendamento", {
                    description: "O card foi atualizado no calendário.",
                });
            }
            loadCalendarData({ silent: true });
        },
        [loadCalendarData]
    );

    // Fetch professional ID on mount
    useEffect(() => {
        async function fetchProfessionalId() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: professional } = await supabase
                    .from("professionals")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (professional) {
                    setProfessionalId(professional.id);
                }
            }
        }

        fetchProfessionalId();
    }, []);

    // Fetch availability when professional ID is available
    useEffect(() => {
        async function loadAvailability() {
            if (!professionalId) return;

            const supabase = createClient();
            const { data } = await supabase
                .from("professional_availability")
                .select("*")
                .eq("professional_id", professionalId)
                .order("day_of_week", { ascending: true });

            if (data) {
                setAvailability(data);
            }
        }

        loadAvailability();
    }, [professionalId]);

    useEffect(() => {
        loadCalendarData();
    }, [loadCalendarData]);

    useAppointmentsRealtime({
        professionalId,
        onStatusChange: handleAppointmentStatusChange,
    });

    // Recarrega ao voltar para a aba ou a cada 15s (fallback se Realtime falhar)
    useEffect(() => {
        const onFocus = () => {
            if (professionalId) loadCalendarData({ silent: true });
        };
        window.addEventListener("focus", onFocus);

        const interval = setInterval(() => {
            if (professionalId && document.visibilityState === "visible") {
                loadCalendarData({ silent: true });
            }
        }, 10000);

        return () => {
            window.removeEventListener("focus", onFocus);
            clearInterval(interval);
        };
    }, [professionalId, loadCalendarData]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (activeView === "day") {
            newDate.setDate(currentDate.getDate() - 1);
        } else if (activeView === "week") {
            newDate.setDate(currentDate.getDate() - 7);
        } else if (activeView === "month") {
            newDate.setMonth(currentDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (activeView === "day") {
            newDate.setDate(currentDate.getDate() + 1);
        } else if (activeView === "week") {
            newDate.setDate(currentDate.getDate() + 7);
        } else if (activeView === "month") {
            newDate.setMonth(currentDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const formatDate = (date: Date) => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${day} de ${month} de ${year}`;
    };

    return (
        <div className="space-y-6">
            {/* Header with tabs, date, and navigation - matching project design */}
            <div className="flex items-center justify-between gap-4">
                <Tabs value={activeView} onValueChange={setActiveView}>
                    <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="day" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Dia
                        </TabsTrigger>
                        <TabsTrigger value="week" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                            <CalendarRange className="h-4 w-4 mr-2" />
                            Semana
                        </TabsTrigger>
                        <TabsTrigger value="month" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Mês
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Date display in the center */}
                <div className="flex-1 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {formatDate(currentDate)}
                    </h2>
                </div>

                {/* Navigation buttons aligned to the right */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        className="border-slate-300 hover:bg-slate-50"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        className="border-slate-300 hover:bg-slate-50"
                    >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            {/* Calendar content */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="text-slate-500">Carregando calendário...</div>
                </div>
            ) : (
                <SchedulerProvider
                    weekStartsOn="monday"
                    initialState={events}
                    onDeleteEvent={handleDeleteAppointment}
                >
                    <CalendarEventsSync events={events} />
                    <Tabs value={activeView} className="w-full">
                        <TabsContent value="day" className="mt-0">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentDate.toISOString()} {...animationConfig}>
                                    <DailyView
                                        stopDayEventSummary={true}
                                        availability={availability}
                                        initialDate={currentDate}
                                        CustomEventComponent={AppointmentEvent}
                                        classNames={{
                                            prev: "hidden",
                                            next: "hidden",
                                        }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </TabsContent>

                        <TabsContent value="week" className="mt-0">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentDate.toISOString()} {...animationConfig}>
                                    <WeeklyView
                                        availability={availability}
                                        currentDate={currentDate}
                                        CustomEventComponent={AppointmentEvent}
                                        classNames={{
                                            prev: "hidden",
                                            next: "hidden",
                                        }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </TabsContent>

                        <TabsContent value="month" className="mt-0">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentDate.toISOString()} {...animationConfig}>
                                    <MonthView
                                        currentDate={currentDate}
                                        CustomEventComponent={AppointmentEvent}
                                        classNames={{
                                            prev: "hidden",
                                            next: "hidden",
                                        }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </TabsContent>
                    </Tabs>
                </SchedulerProvider>
            )}
        </div>
    );
}
