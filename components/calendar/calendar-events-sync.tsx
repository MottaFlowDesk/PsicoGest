"use client";

import { useEffect, useRef } from "react";
import { useScheduler } from "@/providers/schedular-provider";
import { Event } from "@/types";

/** Mantém o SchedulerProvider alinhado com os eventos carregados do Supabase */
export function CalendarEventsSync({ events }: { events: Event[] }) {
    const { dispatch } = useScheduler();
    const signatureRef = useRef("");

    useEffect(() => {
        const signature = events
            .map((e) => `${e.id}:${e.metadata?.status ?? ""}:${e.variant ?? ""}`)
            .join("|");

        if (signature === signatureRef.current) return;
        signatureRef.current = signature;

        dispatch({ type: "SET_EVENTS", payload: events });
    }, [events, dispatch]);

    return null;
}
