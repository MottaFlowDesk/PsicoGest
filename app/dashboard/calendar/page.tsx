"use client";

import SchedulerWrapper from "@/components/schedule/_components/view/schedular-view-filteration";
import { SchedulerProvider } from "@/providers/schedular-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, Calendar as CalendarIcon, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import DailyView from "@/components/schedule/_components/view/day/daily-view";
import WeeklyView from "@/components/schedule/_components/view/week/week-view";
import MonthView from "@/components/schedule/_components/view/month/month-view";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fetchAllCalendarData } from "@/lib/calendar-data";
import { Event } from "@/types";
import { createClient } from "@/lib/supabase/client";
import AppointmentEvent from "@/components/schedule/_components/view/event-component/appointment-event";

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

    // Fetch calendar data when professional ID, date, or view changes
    useEffect(() => {
        async function loadCalendarData() {
            if (!professionalId) return;

            setLoading(true);
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
                setLoading(false);
            }
        }

        loadCalendarData();
    }, [professionalId, currentDate, activeView]);

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
                <SchedulerProvider weekStartsOn="monday" initialState={events}>
                    <Tabs value={activeView} className="w-full">
                        <TabsContent value="day" className="mt-0">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentDate.toISOString()} {...animationConfig}>
                                    <DailyView
                                        stopDayEventSummary={false}
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
