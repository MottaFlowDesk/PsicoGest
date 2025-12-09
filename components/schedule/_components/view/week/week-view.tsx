import React, { useRef, useState, useEffect, useCallback } from "react";
import { useScheduler } from "@/providers/schedular-provider";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion"; // Import Framer Motion
import { useModal } from "@/providers/modal-context";
import AddEventModal from "@/components/schedule/_modals/add-event-modal";
import EventStyled from "../event-component/event-styled";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Maximize2, ChevronLeft, Maximize } from "lucide-react";
import clsx from "clsx";
import { Event, CustomEventModal } from "@/types";
import CustomModal, { CustomModalContent, CustomModalHeader, CustomModalTitle, CustomModalClose } from "../../../../ui/custom-modal";

// Helper to generate hours based on availability
function generateWeeklyHours(availability: any[]) {
  if (!availability || availability.length === 0) {
    // Default 8 AM to 6 PM if no availability, or full day?
    // Let's stick to 24h as fallback or a reasonable 8-18 business hours
    // But user wants "disponibilidade configurado". If none, maybe 24h is safer.
    return {
      hours: Array.from({ length: 24 }, (_, i) => {
        const hour = i % 12 || 12;
        const ampm = i < 12 ? "AM" : "PM";
        return `${hour}:00 ${ampm}`;
      }),
      startHour: 0
    };
  }

  // Find min start and max end across all days
  let minStart = 24;
  let maxEnd = 0;

  availability.forEach(day => {
    const start = parseInt(day.start_time.split(':')[0]);
    const end = parseInt(day.end_time.split(':')[0]); // Assuming e.g. 17:00 is end hour
    // Can also parse end minutes if needed, but grid is hourly.
    // If end is 17:30, we should probably show up to 18:00
    const endParts = day.end_time.split(':');
    let endH = parseInt(endParts[0]);
    if (parseInt(endParts[1]) > 0) endH++;

    if (start < minStart) minStart = start;
    if (endH > maxEnd) maxEnd = endH;
  });

  // Fallback defaults if logic fails
  if (minStart >= 24) minStart = 0;
  if (maxEnd <= 0) maxEnd = 23;

  const hours = [];
  for (let i = minStart; i <= maxEnd; i++) {
    const hour = i % 12 || 12;
    const ampm = i < 12 ? "AM" : "PM";
    hours.push(`${hour}:00 ${ampm}`);
  }

  return { hours, startHour: minStart };
}

interface ChipData {
  id: number;
  color: "primary" | "warning" | "danger";
  title: string;
  description: string;
}

const chipData: ChipData[] = [
  {
    id: 1,
    color: "primary",
    title: "Ads Campaign Nr1",
    description: "Day 1 of 5: Google Ads, Target Audience: SMB-Alpha",
  },
  {
    id: 2,
    color: "warning",
    title: "Ads Campaign Nr2",
    description:
      "All Day: Day 2 of 5: AdSense + FB, Target Audience: SMB2-Delta3",
  },
  {
    id: 3,
    color: "danger",
    title: "Critical Campaign Nr3",
    description: "Day 3 of 5: High-Impact Ads, Target: E-Commerce Gamma",
  },
  {
    id: 4,
    color: "primary",
    title: "Ads Campaign Nr4",
    description: "Day 4 of 5: FB Ads, Audience: Retailers-Zeta",
  },
  {
    id: 5,
    color: "warning",
    title: "Campaign Ending Soon",
    description: "Final Day: Monitor closely, Audience: Delta2-Beta",
  },
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Stagger children animations
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
    opacity: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    transition: {
      opacity: { duration: 0.2, ease: "easeInOut" },
    } as const,
  }),
};

export default function WeeklyView({
  prevButton,
  nextButton,
  CustomEventComponent,
  CustomEventModal,
  classNames,
  availability,
  currentDate: propDate,
}: {
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
  CustomEventComponent?: React.FC<Event>;
  CustomEventModal?: CustomEventModal;
  classNames?: { prev?: string; next?: string; addEvent?: string };
  availability?: any[];
  currentDate?: Date;
}) {
  const { getters, handlers, weekStartsOn } = useScheduler(); // Get weekStartsOn
  const hoursColumnRef = useRef<HTMLDivElement>(null);
  const [detailedHour, setDetailedHour] = useState<string | null>(null);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);

  // Use prop date or default to today. No local state for date navigation anymore (controlled by parent)
  const currentDate = propDate || new Date();

  const [colWidth, setColWidth] = useState<number[]>(Array(7).fill(1)); // Equal width columns by default
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(0);
  const { setOpen } = useModal();

  // Generate hours dynamically
  const { hours, startHour } = React.useMemo(() =>
    generateWeeklyHours(availability || []),
    [availability]);

  // FIXED: Calculate days of week directly from currentDate
  const daysOfWeek = React.useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay(); // 0 (Sun) to 6 (Sat)

    // Calculate start of week (Monday)
    // If week starts on Monday:
    // Sun(0) -> diff -6
    // Mon(1) -> diff 0
    // Tue(2) -> diff -1
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);

    const weekStart = new Date(currentDate);
    weekStart.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Reset column widths when the date changes
  useEffect(() => {
    setColWidth(Array(7).fill(1));
  }, [currentDate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!hoursColumnRef.current) return;
    const rect = hoursColumnRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourHeight = rect.height / hours.length;
    const hour = Math.max(0, Math.min(hours.length - 1, Math.floor(y / hourHeight))) + startHour;
    const minuteFraction = (y % hourHeight) / hourHeight;
    const minutes = Math.floor(minuteFraction * 60);

    // Format in 12-hour format
    const hour12 = hour % 12 || 12;
    const ampm = hour < 12 ? "AM" : "PM";
    setDetailedHour(
      `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`
    );

    // Ensure timelinePosition is never negative and is within bounds
    // 83px offset accounts for the header height
    const headerOffset = 83;
    const position = Math.max(0, Math.min(rect.height, Math.round(y))) + headerOffset;
    setTimelinePosition(position);
  }, []);

  function handleAddEvent(event?: Event) {
    // Create the modal content with the provided event data or defaults
    const startDate = event?.startDate || new Date();
    const endDate = event?.endDate || new Date();

    // Open the modal with the content
    setOpen(
      <CustomModal>
        <CustomModalContent>
          <CustomModalHeader>
            <CustomModalTitle>Add Event</CustomModalTitle>
          </CustomModalHeader>
          <AddEventModal
            CustomAddEventModal={
              CustomEventModal?.CustomAddEventModal?.CustomForm
            }
          />
        </CustomModalContent>
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

  /* Navigation is now controlled by parent
  const handleNextWeek = useCallback(() => {
    setDirection(1);
    // onNext()
  }, []);

  const handlePrevWeek = useCallback(() => {
    setDirection(-1);
    // onPrev()
  }, []);
  */

  function handleAddEventWeek(dayIndex: number, detailedHour: string) {
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

    const chosenDay = daysOfWeek[dayIndex % 7].getDate();

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


  // Group events by time period to prevent splitting spaces within same time blocks
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

    // First, create a graph where events are vertices and edges represent overlaps
    const graph: Record<string, Set<string>> = {};

    // Initialize graph
    for (const event of sortedEvents) {
      graph[event.id] = new Set<string>();
    }

    // Build connections - only connect events that truly overlap in time
    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        // Only consider events that actually overlap in time
        if (eventsOverlap(sortedEvents[i], sortedEvents[j])) {
          graph[sortedEvents[i].id].add(sortedEvents[j].id);
          graph[sortedEvents[j].id].add(sortedEvents[i].id);
        }
      }
    }

    // Use DFS to find connected components (groups of overlapping events)
    const visited = new Set<string>();
    const groups: Event[][] = [];

    for (const event of sortedEvents) {
      if (!visited.has(event.id)) {
        // Start a new component/group
        const group: Event[] = [];
        const stack: Event[] = [event];
        visited.add(event.id);

        // DFS traversal
        while (stack.length > 0) {
          const current = stack.pop()!;
          group.push(current);

          // Visit neighbors (overlapping events)
          for (const neighborId of graph[current.id]) {
            if (!visited.has(neighborId)) {
              const neighbor = sortedEvents.find(e => e.id === neighborId);
              if (neighbor) {
                stack.push(neighbor);
                visited.add(neighborId);
              }
            }
          }
        }

        // Sort this group by start time
        group.sort((a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        groups.push(group);
      }
    }

    return groups;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation buttons hidden - using main page header */}
      <div className="hidden"></div>

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentDate.toISOString()}
          custom={direction}
          variants={pageTransitionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.2 },
          }}
          className={`grid use-automation-zoom-in grid-cols-8 gap-0`}
        >
          {/* Week number cell - simplified */}
          <div className="sticky top-0 left-0 z-30 bg-slate-50 border-r border-b border-slate-200 h-full flex items-center justify-center">
            <span className="text-sm font-medium text-slate-500">
              Sem {getters.getWeekNumber(currentDate)}
            </span>
          </div>

          <div className="col-span-7 flex flex-col relative">
            <div
              className="grid gap-0 flex-grow bg-primary/10 rounded-r-lg"
              style={{
                gridTemplateColumns: colWidth.map(w => `${w}fr`).join(' '),
                transition: isResizing ? 'none' : 'grid-template-columns 0.3s ease-in-out'
              }}
            >
              {daysOfWeek.map((day, idx) => (
                <div key={idx} className="relative relative group flex flex-col">
                  <div className="sticky bg-default-100 top-0 z-20 flex-grow flex items-center justify-center">
                    <div className="text-center p-3 border-b border-slate-200">
                      <div className="text-xs font-medium text-slate-500 uppercase">
                        {getters.getDayName(day.getDay())}
                      </div>
                      <div
                        className={clsx(
                          "text-lg font-semibold mt-1",
                          new Date().getDate() === day.getDate() &&
                            new Date().getMonth() === currentDate.getMonth() &&
                            new Date().getFullYear() === currentDate.getFullYear()
                            ? "text-blue-600"
                            : "text-slate-700"
                        )}
                      >
                        {day.getDate()}
                      </div>

                      {/* Fullscreen icon that appears on hover */}
                      <div
                        className="absolute top-5 right-10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();

                          // Set the selected day
                          const selectedDay = new Date(
                            currentDate.getFullYear(),
                            currentDate.getMonth(),
                            day.getDate()
                          );

                          // Get events for the selected day
                          const dayEvents = getters.getEventsForDay(
                            day.getDate(),
                            currentDate
                          );

                          setOpen(
                            <CustomModal>
                              <CustomModalContent className="max-w-[90vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0">
                                <div className="p-4 border-b flex items-center justify-between">
                                  <div className="flex items-center">
                                    <ChevronLeft
                                      className="cursor-pointer hover:text-primary mr-2"
                                      onClick={() => setOpen(null)}
                                    />
                                    <h2 className="text-2xl font-bold">{getters.getDayName(day.getDay())} {day.getDate()}, {selectedDay.getFullYear()}</h2>
                                  </div>
                                  <CustomModalClose />
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">

                                  {dayEvents && dayEvents.length > 0 ? (
                                    <div className="space-y-4">
                                      {/* Timeline view */}
                                      <div className="relative bg-default-50 rounded-lg p-4 min-h-[500px]">
                                        <div className="grid grid-cols-[100px_1fr] h-full">
                                          {/* Hours column */}
                                          <div className="flex flex-col">
                                            {hours.map((hour, index) => (
                                              <div
                                                key={`hour-${index}`}
                                                className="h-16 p-2 text-sm text-muted-foreground border-r border-b border-default-200"
                                              >
                                                {hour}
                                              </div>
                                            ))}
                                          </div>

                                          {/* Events column */}
                                          <div className="relative">
                                            {/* Hour grid lines */}
                                            {Array.from({ length: 24 }).map((_, index) => (
                                              <div
                                                key={`grid-${index}`}
                                                className="h-16 border-b border-default-200"
                                              />
                                            ))}

                                            {/* Display events */}
                                            {dayEvents.map((event) => {
                                              // Calculate time groups
                                              const timeGroups = groupEventsByTimePeriod(dayEvents);

                                              // Find which time group this event belongs to
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

                                              // Get styling for this event
                                              const { height, top, left, maxWidth, minWidth } = handlers.handleEventStyling(
                                                event,
                                                dayEvents,
                                                {
                                                  eventsInSamePeriod,
                                                  periodIndex,
                                                  adjustForPeriod: true
                                                }
                                              );

                                              // Adjust top position based on startHour
                                              const topVal = parseInt(top as string);
                                              const adjustedTop = `${Math.max(0, topVal - startHour * 64)}px`;

                                              return (
                                                <div
                                                  key={event.id}
                                                  style={{
                                                    position: 'absolute',
                                                    height,
                                                    top: adjustedTop,
                                                    left,
                                                    maxWidth,
                                                    minWidth,
                                                    padding: '0 2px',
                                                    boxSizing: 'border-box',
                                                  }}
                                                >
                                                  <EventStyled
                                                    event={{
                                                      ...event,
                                                      CustomEventComponent,
                                                      minmized: true,
                                                    }}
                                                    CustomEventModal={CustomEventModal}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Event list */}
                                      <div className="bg-card rounded-lg p-4">
                                        <h3 className="text-lg font-semibold mb-4">All Events</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {dayEvents.map(event => (
                                            <div
                                              key={event.id}
                                              className={`p-4 rounded-lg shadow-sm border-l-4 border-${event.variant} hover:shadow-md transition-shadow`}
                                            >
                                              <EventStyled
                                                event={{
                                                  ...event,
                                                  CustomEventComponent,
                                                  minmized: false,
                                                }}
                                                CustomEventModal={CustomEventModal}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                      <p>No events scheduled for this day</p>
                                      <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                          setOpen(null);
                                          handleAddEventWeek(idx, detailedHour || "12:00 PM");
                                        }}
                                      >
                                        Add Event
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CustomModalContent>
                            </CustomModal>
                          );
                        }}
                      >
                        <Maximize size={16} className="text-muted-foreground hover:text-primary" />
                      </div>

                      {/* Resize handle */}
                    </div>
                  </div>
                  <div className="absolute top-12 right-0 w-px h-[calc(100%-3rem)]"></div>
                </div>
              ))}
            </div>

            {detailedHour && (
              <div
                className="absolute flex z-50 left-0 w-full h-[2px] bg-primary/40 rounded-full pointer-events-none"
                style={{ top: `${timelinePosition}px` }}
              >
                <Badge
                  variant="outline"
                  className="absolute -translate-y-1/2 bg-white z-50 left-[5px] text-xs"
                >
                  {detailedHour}
                </Badge>
              </div>
            )}
          </div>

          <div
            ref={hoursColumnRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setDetailedHour(null)}
            className="relative grid grid-cols-8 col-span-8"
          >
            <div className="col-span-1 bg-default-50 hover:bg-default-100 transition duration-400">
              {hours.map((hour, index) => (
                <motion.div
                  key={`hour-${index}`}
                  variants={itemVariants}
                  className="cursor-pointer border-b border-default-200 p-[16px] h-[64px] text-center text-sm text-muted-foreground border-r"
                >
                  {hour}
                </motion.div>
              ))}
            </div>

            <div
              className="col-span-7 bg-default-50 grid h-full"
              style={{
                gridTemplateColumns: colWidth.map(w => `${w}fr`).join(' '),
                transition: isResizing ? 'none' : 'grid-template-columns 0.3s ease-in-out'
              }}
            >
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const dayEvents = getters.getEventsForDay(
                  daysOfWeek[dayIndex % 7].getDate(),
                  currentDate
                );

                // Calculate time groups once for this day's events
                const timeGroups = groupEventsByTimePeriod(dayEvents);

                // Get the count of events to determine if we need to show a "more" button
                const eventsCount = dayEvents?.length || 0;
                const maxEventsToShow = 10; // Limit the number of events to display before showing "more"
                const hasMoreEvents = eventsCount > maxEventsToShow;

                // Only show a subset of events if there are too many
                const visibleEvents = hasMoreEvents
                  ? dayEvents?.slice(0, maxEventsToShow - 1)
                  : dayEvents;

                return (
                  <div
                    key={`day-${dayIndex}`}
                    className="col-span-1 border-default-200 z-20 relative transition duration-300 border-r border-b text-center text-sm text-muted-foreground overflow-hidden"
                  >
                    <AnimatePresence initial={false}>
                      {visibleEvents?.map((event, eventIndex) => {
                        // For better spacing, consider if this event is part of a time group
                        let eventsInSamePeriod = 1;
                        let periodIndex = 0;

                        // Find which time group this event belongs to
                        for (let i = 0; i < timeGroups.length; i++) {
                          const groupIndex = timeGroups[i].findIndex(e => e.id === event.id);
                          if (groupIndex !== -1) {
                            eventsInSamePeriod = timeGroups[i].length;
                            periodIndex = groupIndex;
                            break;
                          }
                        }

                        // Customize styling parameters for events in the same time period
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

                        // Adjust top position based on startHour
                        const topVal = parseInt(top as string);
                        const adjustedTop = `${Math.max(0, topVal - startHour * 64)}px`;

                        return (
                          <motion.div
                            key={event.id}
                            style={{
                              minHeight: height,
                              height,
                              top: adjustedTop,
                              left: left,
                              maxWidth: maxWidth,
                              minWidth: minWidth,
                              padding: '0 2px',
                              boxSizing: 'border-box',
                            }}
                            className="flex transition-all duration-1000 flex-grow flex-col z-50 absolute"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
                            <EventStyled
                              event={{
                                ...event,
                                CustomEventComponent,
                                minmized: true,
                              }}
                              CustomEventModal={CustomEventModal}
                            />
                          </motion.div>
                        );
                      })}

                      {/* Show "more events" button if there are too many */}
                      {hasMoreEvents && (
                        <motion.div
                          key={`more-events-${dayIndex}`}
                          style={{
                            bottom: '10px',
                            right: '10px',
                            position: 'absolute',
                          }}
                          className="z-50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Show a modal with all events for this day
                              setOpen(
                                <CustomModal>
                                  <CustomModalContent>
                                    <CustomModalHeader>
                                      <CustomModalTitle>Events for {daysOfWeek[dayIndex].toDateString()}</CustomModalTitle>
                                    </CustomModalHeader>
                                    <div className="space-y-2 p-2 max-h-[80vh] overflow-y-auto">
                                      {dayEvents?.map((event) => (
                                        <EventStyled
                                          key={event.id}
                                          event={{
                                            ...event,
                                            CustomEventComponent,
                                            minmized: false,
                                          }}
                                          CustomEventModal={CustomEventModal}
                                        />
                                      ))}
                                    </div>
                                  </CustomModalContent>
                                </CustomModal>
                              );
                            }}
                          >
                            +{eventsCount - (maxEventsToShow - 1)} more
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Render hour slots */}
                    {Array.from({ length: hours.length }, (_, hourIndex) => (
                      <div
                        key={`day-${dayIndex}-hour-${hourIndex}`}
                        className="col-span-1 border-default-200 h-[64px] relative transition duration-300 border-r border-b text-center text-sm text-muted-foreground"
                      >
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div >
      </AnimatePresence >


    </div >
  );
}
