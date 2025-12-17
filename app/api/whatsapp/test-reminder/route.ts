import { createClient } from "@/lib/supabase/server";
import { sendAppointmentReminder } from "@/lib/whatsapp/client";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { randomUUID } from "crypto";

// POST - Send test reminder for a real appointment
export async function POST(request: NextRequest) {
    try {
        const { phone } = await request.json();
        
        if (!phone) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Get the logged-in professional
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Get professional data
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, full_name, whatsapp_connected_at")
            .eq("user_id", user.id)
            .single();

        if (!professional?.whatsapp_connected_at) {
            return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
        }

        // Find the next appointment for this professional
        const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select(`
                id,
                scheduled_at,
                duration_minutes,
                type,
                status,
                confirmation_token,
                patients (
                    id,
                    full_name,
                    phone
                )
            `)
            .eq("professional_id", professional.id)
            .gte("scheduled_at", new Date().toISOString())
            .in("status", ["scheduled", "pending"])
            .order("scheduled_at", { ascending: true })
            .limit(1)
            .single();

        if (appointmentError || !appointment) {
            // Create a test appointment if none exists
            return NextResponse.json({ 
                error: "No upcoming appointments found. Create an appointment first.",
                suggestion: "Create a new appointment in the calendar, then try again."
            }, { status: 404 });
        }

        // Generate confirmation token if it doesn't exist
        let confirmationToken = appointment.confirmation_token;
        if (!confirmationToken) {
            confirmationToken = randomUUID();
            await supabase
                .from("appointments")
                .update({ confirmation_token: confirmationToken })
                .eq("id", appointment.id);
        }

        // Format date and time
        const scheduledDate = new Date(appointment.scheduled_at);
        const formattedDate = format(scheduledDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
        const formattedTime = format(scheduledDate, "HH:mm");

        // Send the reminder
        const result = await sendAppointmentReminder(
            professional.id,
            phone, // Use the provided phone for testing
            {
                patientName: appointment.patients?.full_name || "Paciente",
                professionalName: professional.full_name,
                date: formattedDate,
                time: formattedTime,
                type: appointment.type as 'in_person' | 'telehealth',
                appointmentId: appointment.id,
                confirmationToken: confirmationToken,
            }
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            appointmentId: appointment.id,
            confirmationLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${confirmationToken}`,
            patientName: appointment.patients?.full_name,
            scheduledAt: appointment.scheduled_at,
        });

    } catch (error: any) {
        console.error("Error sending test reminder:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET - Get info about upcoming appointments
export async function GET() {
    try {
        const supabase = await createClient();

        // Get the logged-in professional
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Get professional data
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, full_name, whatsapp_connected_at")
            .eq("user_id", user.id)
            .single();

        // Get upcoming appointments
        const { data: appointments } = await supabase
            .from("appointments")
            .select(`
                id,
                scheduled_at,
                type,
                status,
                confirmation_token,
                patients (full_name, phone)
            `)
            .eq("professional_id", professional?.id)
            .gte("scheduled_at", new Date().toISOString())
            .order("scheduled_at", { ascending: true })
            .limit(5);

        return NextResponse.json({
            professional: {
                id: professional?.id,
                name: professional?.full_name,
                whatsappConnected: !!professional?.whatsapp_connected_at,
            },
            upcomingAppointments: appointments || [],
        });

    } catch (error: any) {
        console.error("Error getting info:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

