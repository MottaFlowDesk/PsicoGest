"use client";

import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Video, MapPin, User } from "lucide-react";

import { useModal } from "@/providers/modal-context";
import { Event } from "@/types";
import { cn } from "@/lib/utils";
import AppointmentDetailsModal from "@/components/schedule/_modals/appointment-details-modal";

export default function AppointmentEvent(props: Event & { minmized?: boolean }) {
    const { setOpen } = useModal();
    const compact = Boolean(props.minmized);
    const isOnline =
        props.metadata?.appointmentType === "telehealth" ||
        props.metadata?.appointmentType === "online";
    const status = props.metadata?.status;
    const isConfirmed = status === "confirmed";
    const displayName = compact
        ? (props.title?.split(/\s+/)[0] ?? props.title)
        : props.title;

    // Determine colors based on status (priority) or variant (fallback)
    const getColorClasses = () => {
        // Priority: Use status if available
        if (status) {
            switch (status) {
                case "confirmed":
                    return "bg-green-100 border-green-300 text-green-800 hover:bg-green-200";
                case "cancelled":
                    return "bg-red-100 border-red-300 text-red-800 hover:bg-red-200 line-through opacity-80";
                case "completed":
                    return "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 opacity-90";
                case "no_show":
                    return "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200";
                case "scheduled":
                default:
                    return "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100";
            }
        }

        // Fallback: Use variant if status is not available
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
                "w-full h-full min-h-0 min-w-0 overflow-hidden rounded-md border cursor-pointer transition-colors duration-200 select-none",
                compact ? "px-1.5 py-0.5 text-[10px] leading-tight" : "p-2 text-xs",
                getColorClasses()
            )}
        >
            <div className={cn("flex h-full min-h-0 min-w-0", compact ? "flex-col gap-0" : "flex-col gap-1")}>
                <div className="flex items-center gap-0.5 min-w-0">
                    <span className="font-semibold truncate min-w-0">
                        {displayName}
                    </span>
                    {!compact && isConfirmed && (
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-green-600 text-white px-1.5 py-0.5 rounded">
                            Confirmado
                        </span>
                    )}
                    {isOnline ? (
                        <Video className={cn("flex-shrink-0 opacity-70", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                    ) : (
                        <MapPin className={cn("flex-shrink-0 opacity-70", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                    )}
                </div>

                <div
                    className={cn(
                        "min-w-0 opacity-90",
                        compact
                            ? "truncate whitespace-nowrap text-[9px] tabular-nums"
                            : "flex items-center gap-1 text-[10px] sm:text-xs"
                    )}
                >
                    {compact ? (
                        <span className="truncate">
                            {format(props.startDate, "HH:mm")}–{format(props.endDate, "HH:mm")}
                        </span>
                    ) : (
                        <>
                            <span className="whitespace-nowrap">
                                {format(props.startDate, "HH:mm")} – {format(props.endDate, "HH:mm")}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate hidden sm:inline">
                                {props.description?.replace("Duração: ", "")}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
