"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { useScheduler } from "@/providers/schedular-provider";
import { useModal } from "@/providers/modal-context";
import AddEventModal from "@/components/schedule/_modals/add-event-modal";
import EventStyled from "../event-component/event-styled";
import { CustomEventModal, Event } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomModal from "@/components/ui/custom-modal";

// Helper function to generate hours based on availability
function generateHoursFromAvailability(availability: any[], currentDate: Date): string[] {
  if (!availability || availability.length === 0) {
    // Default to 24 hours if no availability
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? "AM" : "PM";
      return `${hour}:00 ${ampm}`;
    });
  }

  const dayOfWeek = currentDate.getDay();
  const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

  if (!dayAvailability) {
    // Professional doesn't work this day
    return [];
  }

  // Parse start and end times
  const startParts = dayAvailability.start_time.split(':');
  const endParts = dayAvailability.end_time.split(':');
  const startHour = parseInt(startParts[0]);
  const endHour = parseInt(endParts[0]);

  // Generate hours for work period
  const workHours: string[] = [];
  for (let i = startHour; i <= endHour; i++) {
    const hour = i % 12 || 12;
    const ampm = i < 12 ? "AM" : "PM";
    workHours.push(`${hour}:00 ${ampm}`);
  }

  return workHours;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Stagger effect between children
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12 } },
};

const pageTransitionVariants = {
  enter: (direction: number) => ({
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    transition: {
      opacity: { duration: 0.2, ease: "easeInOut" },
    },
  }),
};

// Precise time-based event grouping function
const groupEventsByTimePeriod = (events: Event[] | undefined) => {
  if (!events || events.length === 0) return [];

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Precise time overlap checking function
  const eventsOverlap = (event1: Event, event2: Event) => {
    const start1 = new Date(event1.startDate).getTime();
    const end1 = new Date(event1.endDate).getTime();
    const start2 = new Date(event2.startDate).getTime();
    const end2 = new Date(event2.endDate).getTime();

    // Strict time overlap - one event starts before the other ends
    return (start1 < end2 && start2 < end1);
  };

  // Use a graph-based approach to find connected components (overlapping event groups)
  const buildOverlapGraph = (events: Event[]) => {
    // Create adjacency list
    const graph: Record<string, string[]> = {};

    // Initialize graph
    events.forEach(event => {
      graph[event.id] = [];
    });

    // Build connections
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (eventsOverlap(events[i], events[j])) {
          graph[events[i].id].push(events[j].id);
          graph[events[j].id].push(events[i].id);
        }
      }
    }

    return graph;
  };

  // Find connected components using DFS
  const findConnectedComponents = (graph: Record<string, string[]>, events: Event[]) => {
    const visited: Record<string, boolean> = {};
    const components: Event[][] = [];

    // DFS function to traverse the graph
    const dfs = (nodeId: string, component: string[]) => {
      visited[nodeId] = true;
      component.push(nodeId);

      for (const neighbor of graph[nodeId]) {
        if (!visited[neighbor]) {
          dfs(neighbor, component);
        }
      }
    };

    // Find all connected components
    for (const event of events) {
      if (!visited[event.id]) {
        const component: string[] = [];
        dfs(event.id, component);

        // Map IDs back to events
        const eventGroup = component.map(id =>
          events.find(e => e.id === id)!
        );

        components.push(eventGroup);
      }
    }

    return components;
  };

  // Build the overlap graph
  const graph = buildOverlapGraph(sortedEvents);

  // Find connected components (groups of overlapping events)
  const timeGroups = findConnectedComponents(graph, sortedEvents);

  // Sort events within each group by start time
  return timeGroups.map(group =>
    group.sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
  );
};

export default function DailyView({
  prevButton,
  nextButton,
  CustomEventComponent,
  CustomEventModal,
  stopDayEventSummary,
  classNames,
  availability,
  initialDate,
}: {
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
  CustomEventComponent?: React.FC<Event>;
  CustomEventModal?: CustomEventModal;
  stopDayEventSummary?: boolean;
  availability?: any[];
  initialDate?: Date;
  classNames?: {
    prev?: string;
    next?: string;
    root?: string;
    header?: string;
    body?: string;
    footer?: string;
    title?: string;
    description?: string;
    content?: string;
    close?: string;
  };
}) {
  const hoursColumnRef = useRef<HTMLDivElement>(null);
  const [detailedHour, setDetailedHour] = useState<string | null>(null);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [direction, setDirection] = useState<number>(0);
  const { setOpen } = useModal();

  // Sync currentDate with initialDate when it changes
  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);
  const { getters, handlers } = useScheduler();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!hoursColumnRef.current) return;
      const rect = hoursColumnRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourHeight = rect.height / 24;
      const hour = Math.max(0, Math.min(23, Math.floor(y / hourHeight)));
      const minuteFraction = (y % hourHeight) / hourHeight;
      const minutes = Math.floor(minuteFraction * 60);

      // Format in 12-hour format
      const hour12 = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      setDetailedHour(
        `${hour12}:${Math.max(0, minutes).toString().padStart(2, "0")} ${ampm}`
      );

      // Ensure timelinePosition is never negative and is within bounds
      const position = Math.max(0, Math.min(rect.height, Math.round(y)));
      setTimelinePosition(position);
    },
    []
  );

  const getFormattedDayTitle = useCallback(
    () => currentDate.toDateString(),
    [currentDate]
  );

  const dayEvents = getters.getEventsForDay(
    currentDate?.getDate() || 0,
    currentDate
  );

  // Generate hours based on availability
  const hours = generateHoursFromAvailability(availability || [], currentDate);

  // Calculate time groups once for all events
  const timeGroups = groupEventsByTimePeriod(dayEvents);

  function handleAddEvent(event?: Event) {
    // Create the modal content with the provided event data or defaults
    const startDate = event?.startDate || new Date();
    const endDate = event?.endDate || new Date();

    // Open the modal with the content

    setOpen(
      <CustomModal title="Add Event">
        <AddEventModal
          CustomAddEventModal={
            CustomEventModal?.CustomAddEventModal?.CustomForm
          }
        />
      </CustomModal>,
      async () => {
        return {
          ...event,
          startDate,
          endDate,
        };
      }
    );
  }

  function handleAddEventDay(detailedHour: string) {
    if (!detailedHour) {
      console.error("Detailed hour not provided.");
      return;
    }

    // Parse the 12-hour format time
    const [timePart, ampm] = detailedHour.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    let hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);

    // Convert to 24-hour format for Date object
    if (ampm === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }

    const chosenDay = currentDate.getDate();

    // Ensure day is valid
    if (chosenDay < 1 || chosenDay > 31) {
      console.error("Invalid day selected:", chosenDay);
      return;
    }

    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      chosenDay,
      hours,
      minutes
    );

    handleAddEvent({
      startDate: date,
      endDate: new Date(date.getTime() + 60 * 60 * 1000), // 1-hour duration
      title: "",
      id: "",
      variant: "primary",
    });
  }

  const handleNextDay = useCallback(() => {
    setDirection(1);
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    setCurrentDate(nextDay);
  }, [currentDate]);

  const handlePrevDay = useCallback(() => {
    setDirection(-1);
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    setCurrentDate(prevDay);
  }, [currentDate]);

  return (
    <div className="">
      <div className="flex justify-end gap-2 mb-6 hidden">
        <h1 className="text-2xl font-semibold text-slate-900">
          {getFormattedDayTitle()}
        </h1>

        <div className="flex ml-auto gap-2">
          {prevButton ? (
            <div onClick={handlePrevDay}>{prevButton}</div>
          ) : (
            <Button
              variant={"outline"}
              className={classNames?.prev}
              onClick={handlePrevDay}
            >
              <ArrowLeft className="h-4 w-4" />
              Prev
            </Button>
          )}
          {nextButton ? (
            <div onClick={handleNextDay}>{nextButton}</div>
          ) : (
            <Button
              variant={"outline"}
              className={classNames?.next}
              onClick={handleNextDay}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentDate.toISOString()}
          custom={direction}
          variants={pageTransitionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="flex flex-col gap-4"
        >
          {!stopDayEventSummary && (
            <div className="all-day-events">
              <AnimatePresence initial={false}>
                {dayEvents && dayEvents?.length
                  ? dayEvents?.map((event, eventIndex) => {
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mb-2"
                      >
                        <EventStyled
                          event={{
                            ...event,
                            CustomEventComponent,
                            minmized: false,
                          }}
                          CustomEventModal={CustomEventModal}
                        />
                      </motion.div>
                    );
                  })
                  : "No events for today"}
              </AnimatePresence>
            </div>
          )}

          {hours.length === 0 ? (
            <div className="relative rounded-lg bg-slate-50 border border-slate-200 overflow-hidden p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Dia Indisponível</h3>
                <p className="text-slate-500 max-w-md">
                  Não há horários de atendimento configurados para este dia da semana.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-lg bg-white border border-slate-200 overflow-hidden">
              <motion.div
                className="relative rounded-lg flex ease-in-out"
                ref={hoursColumnRef}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setDetailedHour(null)}
              >
                <div className="flex flex-col border-r border-slate-200">
                  {hours.map((hour: string, index: number) => (
                    <motion.div
                      key={`hour-${index}`}
                      variants={itemVariants}
                      className="cursor-pointer transition duration-300 p-4 h-[64px] text-left text-xs text-slate-500 border-b border-slate-100"
                    >
                      {hour}
                    </motion.div>
                  ))}
                </div>
                <div className="flex relative flex-grow flex-col">
                  {Array.from({ length: hours.length }).map((_, index) => (
                    <div
                      key={`hour-${index}`}
                      className="w-full relative border-b hover:bg-blue-50/50 transition duration-300 p-4 h-[64px] text-left text-sm text-slate-400 border-slate-100"
                    >
                    </div>
                  ))}
                  <AnimatePresence initial={false}>
                    {dayEvents && dayEvents?.length
                      ? dayEvents?.map((event, eventIndex) => {
                        const timeGroups = groupEventsByTimePeriod(dayEvents);
                        let eventsInSamePeriod = 1;
                        let periodIndex = 0;

                        for (let i = 0; i < timeGroups.length; i++) {
                          const groupIndex = timeGroups[i].findIndex(e => e.id === event.id);
                          if (groupIndex !== -1) {
                            eventsInSamePeriod = timeGroups[i].length;
                            periodIndex = groupIndex;
                            break;
                          }
                        }

                        const {
                          height,
                          left,
                          maxWidth,
                          minWidth,
                          top,
                          zIndex,
                        } = handlers.handleEventStyling(
                          event,
                          dayEvents,
                          {
                            eventsInSamePeriod,
                            periodIndex,
                            adjustForPeriod: true
                          }
                        );
                        return (
                          <motion.div
                            key={event.id}
                            style={{
                              minHeight: height,
                              top: top,
                              left: left,
                              minWidth: minWidth,
                              maxWidth: maxWidth,
                              zIndex: zIndex,
                            }}
                            className="absolute"
                          >
                            <EventStyled
                              event={{
                                ...event,
                                CustomEventComponent,
                                minmized: false,
                              }}
                              CustomEventModal={CustomEventModal}
                            />
                          </motion.div>
                        );
                      })
                      : null}
                  </AnimatePresence>

                  {detailedHour && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-blue-500 pointer-events-none"
                      style={{ top: `${timelinePosition}px` }}
                    >
                      <div className="absolute -top-3 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        {detailedHour}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
