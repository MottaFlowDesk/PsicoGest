import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google/calendar";
import { sendEmail, generateMeetLinkEmailHtml } from "@/lib/google/gmail";
import { sendWhatsAppMessage, generateMeetLinkMessage } from "@/lib/whatsapp/client";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        whatsapp_connected_at: string | null;
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
        const supabase = await createClient();

        // Find appointment by confirmation token
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                id,
                scheduled_at,
                duration_minutes,
                type,
                status,
                meeting_link,
                patients (
                    full_name,
                    email,
                    phone
                ),
                professionals (
                    id,
                    full_name,
                    google_refresh_token,
                    whatsapp_connected_at
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
            meeting_link: appointment.meeting_link,
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
        const supabase = await createClient();

        // Find appointment by confirmation token
        const { data: appointmentData, error: fetchError } = await supabase
            .from("appointments")
            .select(`
                id,
                scheduled_at,
                duration_minutes,
                type,
                status,
                meeting_link,
                patients (
                    full_name,
                    email,
                    phone
                ),
                professionals (
                    id,
                    full_name,
                    google_refresh_token,
                    google_calendar_connected,
                    whatsapp_connected_at
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
                meeting_link: appointment.meeting_link,
            });
        }

        // Check if appointment is in the past
        if (new Date(appointment.scheduled_at) < new Date()) {
            return NextResponse.json(
                { error: "Este agendamento já passou" },
                { status: 400 }
            );
        }

        let meetingLink: string | null = null;

        // If telehealth and professional has Google connected, create Meet
        if (
            appointment.type === "telehealth" &&
            appointment.professionals?.google_calendar_connected &&
            appointment.professionals?.google_refresh_token
        ) {
            try {
                const startTime = new Date(appointment.scheduled_at);
                const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000);

                const result = await createCalendarEvent(
                    appointment.professionals.google_refresh_token,
                    {
                        summary: `Sessão com ${appointment.patients?.full_name || "Paciente"}`,
                        description: "Sessão de terapia - PsicoGest",
                        startTime,
                        endTime,
                        attendeeEmail: appointment.patients?.email || undefined,
                        createMeet: true,
                    }
                );

                meetingLink = result.meetLink || null;
            } catch (meetError) {
                console.error("Error creating Google Meet:", meetError);
                // Continue without Meet link - don't fail the confirmation
            }
        }

        // Update appointment status
        const { error: updateError } = await supabase
            .from("appointments")
            .update({
                status: "confirmed",
                confirmed_at: new Date().toISOString(),
                meeting_link: meetingLink,
            })
            .eq("id", appointment.id);

        if (updateError) {
            console.error("Error updating appointment:", updateError);
            return NextResponse.json(
                { error: "Erro ao confirmar agendamento" },
                { status: 500 }
            );
        }

        // Send meeting link to patient if we have one
        if (meetingLink && appointment.patients) {
            const scheduledDate = new Date(appointment.scheduled_at);
            const formattedDate = format(scheduledDate, "EEEE, d 'de' MMMM", { locale: ptBR });
            const formattedTime = format(scheduledDate, "HH:mm");

            // Try to send via WhatsApp first
            if (
                appointment.professionals?.whatsapp_connected_at &&
                appointment.patients.phone
            ) {
                try {
                    await sendWhatsAppMessage(
                        appointment.professionals.id,
                        appointment.patients.phone,
                        generateMeetLinkMessage({
                            patientName: appointment.patients.full_name,
                            professionalName: appointment.professionals.full_name,
                            date: formattedDate,
                            time: formattedTime,
                            meetLink: meetingLink,
                        })
                    );
                } catch (whatsappError) {
                    console.error("Error sending WhatsApp:", whatsappError);
                }
            }

            // Also send via email if Google is connected
            if (
                appointment.professionals?.google_refresh_token &&
                appointment.patients.email
            ) {
                try {
                    await sendEmail(
                        appointment.professionals.google_refresh_token,
                        {
                            to: appointment.patients.email,
                            subject: `✓ Sessão Confirmada - ${formattedDate}`,
                            html: generateMeetLinkEmailHtml({
                                patientName: appointment.patients.full_name,
                                professionalName: appointment.professionals.full_name,
                                date: formattedDate,
                                time: formattedTime,
                                meetLink: meetingLink,
                            }),
                        }
                    );
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                }
            }
        }

        return NextResponse.json({
            success: true,
            meeting_link: meetingLink,
        });
    } catch (error: any) {
        console.error("Error confirming appointment:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

