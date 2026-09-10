import { createAdminClient } from "@/lib/supabase/admin";
import {
    createCalendarEvent,
    addGoogleMeetToCalendarEvent,
    invitePatientToCalendarEvent,
} from "@/lib/google/calendar";
import { enqueueAppointmentMessage, processOutbox } from "@/lib/messaging/outbox";
import {
    confirmAppointmentInDb,
    pickMeetLinkFromRow,
} from "@/lib/appointments/confirm-appointment-db";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

interface RouteContext {
    params: Promise<{ token: string }>;
}

// Type for the appointment with relations
interface AppointmentWithRelations {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    type: string;
    status: string;
    meeting_link: string | null;
    meet_link?: string | null;
    google_calendar_event_id: string | null;
    patients: {
        full_name: string;
        email: string | null;
        phone: string | null;
    } | null;
    professionals: {
        id: string;
        full_name: string;
        google_refresh_token: string | null;
        google_calendar_connected: boolean | null;
    } | null;
}

// Helper to normalize Supabase relations (returns array sometimes)
function normalizeAppointment(data: any): AppointmentWithRelations {
    return {
        ...data,
        patients: Array.isArray(data.patients) ? data.patients[0] : data.patients,
        professionals: Array.isArray(data.professionals) ? data.professionals[0] : data.professionals,
    };
}

// GET - Fetch appointment data
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { token } = await context.params;
        const supabase = createAdminClient();

        // Find appointment by confirmation token
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                *,
                patients (
                    full_name,
                    email,
                    phone
                ),
                professionals (
                    id,
                    full_name,
                    google_refresh_token
                )
            `)
            .eq("confirmation_token", token)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: "Agendamento não encontrado ou link expirado" },
                { status: 404 }
            );
        }

        const appointment = normalizeAppointment(data);

        // Check if appointment is in the past
        if (new Date(appointment.scheduled_at) < new Date()) {
            return NextResponse.json(
                { error: "Este agendamento já passou" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            id: appointment.id,
            patient_name: appointment.patients?.full_name || "Paciente",
            professional_name: appointment.professionals?.full_name || "Profissional",
            scheduled_at: appointment.scheduled_at,
            duration_minutes: appointment.duration_minutes,
            type: appointment.type,
            status: appointment.status,
            meeting_link: pickMeetLinkFromRow(appointment),
        });
    } catch (error: any) {
        console.error("Error fetching appointment:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Confirm appointment
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { token } = await context.params;
        const supabase = createAdminClient();

        // Find appointment by confirmation token
        const { data: appointmentData, error: fetchError } = await supabase
            .from("appointments")
            .select(`
                *,
                patients (
                    full_name,
                    email,
                    phone
                ),
                professionals (
                    id,
                    full_name,
                    google_refresh_token,
                    google_calendar_connected
                )
            `)
            .eq("confirmation_token", token)
            .single();

        if (fetchError || !appointmentData) {
            return NextResponse.json(
                { error: "Agendamento não encontrado" },
                { status: 404 }
            );
        }

        const appointment = normalizeAppointment(appointmentData);

        // Check if already confirmed
        if (appointment.status === "confirmed") {
            return NextResponse.json({
                success: true,
                already_confirmed: true,
                meeting_link: pickMeetLinkFromRow(appointment),
            });
        }

        // Check if appointment is in the past
        if (new Date(appointment.scheduled_at) < new Date()) {
            return NextResponse.json(
                { error: "Este agendamento já passou" },
                { status: 400 }
            );
        }

        let meetingLink: string | null = pickMeetLinkFromRow(appointment);

        // Meet para teleconsulta: usa evento existente ou cria novo
        if (
            appointment.type === "telehealth" &&
            !meetingLink &&
            appointment.professionals?.google_calendar_connected &&
            appointment.professionals?.google_refresh_token
        ) {
            try {
                const refreshToken = appointment.professionals.google_refresh_token;

                if (appointment.google_calendar_event_id) {
                    const result = await addGoogleMeetToCalendarEvent(
                        refreshToken,
                        appointment.google_calendar_event_id
                    );
                    meetingLink = result.meetLink || null;
                } else {
                    const startTime = new Date(appointment.scheduled_at);
                    const endTime = new Date(
                        startTime.getTime() + appointment.duration_minutes * 60000
                    );

                    const result = await createCalendarEvent(refreshToken, {
                        summary: `Sessão com ${appointment.patients?.full_name || "Paciente"}`,
                        description: "Sessão de terapia - PsicoGuest",
                        startTime,
                        endTime,
                        attendeeEmail: appointment.patients?.email || undefined,
                        sendInvitation: true,
                        createMeet: true,
                    });

                    meetingLink = result.meetLink || null;

                    if (result.eventId) {
                        await supabase
                            .from("appointments")
                            .update({ google_calendar_event_id: result.eventId })
                            .eq("id", appointment.id);
                    }
                }
            } catch (meetError) {
                console.error("Error creating Google Meet:", meetError);
            }
        }

        let updatedRow;
        try {
            updatedRow = await confirmAppointmentInDb(
                supabase,
                appointment.id,
                meetingLink
            );
        } catch (confirmError) {
            console.error("Error confirming appointment:", confirmError);
            return NextResponse.json(
                { error: "Erro ao confirmar agendamento" },
                { status: 500 }
            );
        }

        // Envia convite do Google Calendar após confirmação (não no agendamento inicial)
        if (
            appointment.google_calendar_event_id &&
            appointment.professionals?.google_refresh_token &&
            appointment.patients?.email
        ) {
            try {
                await invitePatientToCalendarEvent(
                    appointment.professionals.google_refresh_token,
                    appointment.google_calendar_event_id,
                    appointment.patients.email
                );
            } catch (inviteError) {
                console.error("Error inviting patient to calendar:", inviteError);
            }
        }

        // Atualiza calendário aberto do profissional assim que o paciente confirma
        const { broadcastAppointmentStatus } = await import(
            "@/lib/realtime/appointment-status-broadcast"
        );
        await broadcastAppointmentStatus(
            updatedRow.professional_id,
            updatedRow.id,
            "confirmed"
        );

        // Notificação in-app para o profissional (card verde + sino)
        if (appointment.professionals?.id && appointment.patients) {
            try {
                const { notifyAppointmentConfirmed } = await import(
                    "@/lib/notifications/appointment-notifications"
                );
                const scheduledDate = new Date(appointment.scheduled_at);
                await notifyAppointmentConfirmed(appointment.professionals.id, {
                    patientName: appointment.patients.full_name,
                    appointmentDate: appointment.scheduled_at,
                    appointmentTime: format(scheduledDate, "HH:mm"),
                    appointmentId: appointment.id,
                });
            } catch (notificationError) {
                console.error("Failed to notify professional:", notificationError);
            }
        }

        // Link da videochamada segue pela outbox (WhatsApp da plataforma + e-mail)
        if (meetingLink && appointment.patients) {
            try {
                await enqueueAppointmentMessage({
                    appointmentId: appointment.id,
                    kind: "meet_link",
                    meetLink: meetingLink,
                    supabase,
                });
                await processOutbox({ batchSize: 5 });
            } catch (outboxError) {
                console.error("Error queueing meet link message:", outboxError);
            }
        }

        return NextResponse.json({
            success: true,
            meeting_link: meetingLink,
            meet_link: meetingLink,
        });
    } catch (error: any) {
        console.error("Error confirming appointment:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

