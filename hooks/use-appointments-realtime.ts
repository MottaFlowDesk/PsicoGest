"use client";



import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

import { getAppointmentStatusChannelName } from "@/lib/realtime/appointment-status-broadcast";



interface AppointmentRealtimeRow {

    id: string;

    status: string;

    professional_id: string;

}



interface StatusChangedPayload {

    appointmentId: string;

    status: string;

}



interface UseAppointmentsRealtimeOptions {

    professionalId: string | null;

    onStatusChange?: (appointmentId: string, status: string) => void;

}



/**

 * Escuta confirmação do paciente via broadcast (servidor) e postgres_changes (fallback).

 */

export function useAppointmentsRealtime({

    professionalId,

    onStatusChange,

}: UseAppointmentsRealtimeOptions) {

    useEffect(() => {

        if (!professionalId || !onStatusChange) return;



        const supabase = createClient();

        const channelName = getAppointmentStatusChannelName(professionalId);



        const channel = supabase

            .channel(channelName, {

                config: { broadcast: { self: true } },

            })

            .on("broadcast", { event: "status_changed" }, (message) => {

                const payload = message.payload as StatusChangedPayload;

                if (payload?.appointmentId && payload?.status) {

                    onStatusChange(payload.appointmentId, payload.status);

                }

            })

            .on(

                "postgres_changes",

                {

                    event: "UPDATE",

                    schema: "public",

                    table: "appointments",

                    filter: `professional_id=eq.${professionalId}`,

                },

                (payload) => {

                    const row = payload.new as AppointmentRealtimeRow;

                    if (row?.id && row?.status) {

                        onStatusChange(row.id, row.status);

                    }

                }

            )

            .subscribe((status) => {

                if (status === "CHANNEL_ERROR") {

                    console.warn(

                        "[realtime] Falha no canal de agendamentos — use polling ou execute enable_appointments_realtime.sql"

                    );

                }

            });



        return () => {

            supabase.removeChannel(channel);

        };

    }, [professionalId, onStatusChange]);

}

