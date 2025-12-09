"use client";

import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Video, MapPin, User } from "lucide-react";

import { useModal } from "@/providers/modal-context";
import { Event } from "@/types";
import { cn } from "@/lib/utils";
import AppointmentDetailsModal from "@/components/schedule/_modals/appointment-details-modal";

export default function AppointmentEvent(props: Event) {
    const { setOpen } = useModal();
    const isOnline = props.metadata?.appointmentType === "online";
    const status = props.metadata?.status;

    // Determine colors based on status/variant
    const getColorClasses = () => {
        const variant = props.variant || "primary";

        const colors = {
            primary: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
            success: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
            danger: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
            default: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100",
        };

        return colors[variant as keyof typeof colors] || colors.primary;
    };

    const handleClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent parent EventStyled from opening the default modal
        e.stopPropagation();

        // Open our custom details modal
        setOpen(<AppointmentDetailsModal event={props} />);
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "w-full h-full p-2 rounded-md border text-xs cursor-pointer transition-colors duration-200 select-none",
                getColorClasses()
            )}
        >
            <div className="flex flex-col h-full gap-1">
                <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">
                        {props.title}
                    </span>
                    {isOnline ? (
                        <Video className="w-3 h-3 flex-shrink-0 opacity-70" />
                    ) : (
                        <MapPin className="w-3 h-3 flex-shrink-0 opacity-70" />
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-90 text-[10px] sm:text-xs">
                    <span>
                        {format(props.startDate, "HH:mm")} - {format(props.endDate, "HH:mm")}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate hidden sm:inline">
                        {props.description?.replace("Duração: ", "")}
                    </span>
                </div>
            </div>
        </div>
    );
}
