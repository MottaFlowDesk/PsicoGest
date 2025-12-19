import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Evolution API Webhook - receives button responses and messages
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

        // Evolution API sends different event types
        const event = body.event;
        const data = body.data;
        const instance = body.instance;

        // Handle button response
        if (event === 'messages.upsert' && data?.message?.buttonsResponseMessage) {
            const buttonResponse = data.message.buttonsResponseMessage;
            const selectedButtonId = buttonResponse.selectedButtonId;
            const phone = data.key.remoteJid?.replace('@s.whatsapp.net', '');

            console.log('[WhatsApp Webhook] Button clicked:', selectedButtonId, 'from:', phone);

            // Parse button ID (format: confirm_appointmentId or reschedule_appointmentId)
            if (selectedButtonId?.startsWith('confirm_')) {
                const appointmentId = selectedButtonId.replace('confirm_', '');
                await handleConfirmation(appointmentId, phone, instance);
            } else if (selectedButtonId?.startsWith('reschedule_')) {
                const appointmentId = selectedButtonId.replace('reschedule_', '');
                await handleRescheduleRequest(appointmentId, phone, instance);
            }
        }

        // Handle regular text message responses (fallback for "SIM" or "CONFIRMAR")
        if (event === 'messages.upsert' && data?.message?.conversation) {
            const messageText = data.message.conversation.toLowerCase().trim();
            const phone = data.key.remoteJid?.replace('@s.whatsapp.net', '');

            if (['sim', 'confirmar', 'confirmo', 'ok'].includes(messageText)) {
                // Try to find pending appointment for this phone
                await handleTextConfirmation(phone, instance);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WhatsApp Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

// Also accept GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'WhatsApp webhook active' });
}

async function handleConfirmation(appointmentId: string, phone: string, instanceName: string) {
    console.log('[WhatsApp Webhook] Processing confirmation for appointment:', appointmentId);

    const supabase = await createClient();

    // Update appointment status to confirmed
    const { data: appointment, error } = await supabase
        .from('appointments')
        .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_via: 'whatsapp',
        })
        .eq('id', appointmentId)
        .select(`
            *,
            patients(full_name, phone),
            professionals(id, full_name)
        `)
        .single();

    if (error) {
        console.error('[WhatsApp Webhook] Error updating appointment:', error);
        return;
    }

    console.log('[WhatsApp Webhook] Appointment confirmed:', appointment);

    // Send confirmation message back
    if (appointment?.professionals?.id) {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client');
        
        await sendWhatsAppMessage(
            appointment.professionals.id,
            phone,
            `✅ *Consulta Confirmada!*\n\nObrigado ${appointment.patients?.full_name}! Sua consulta foi confirmada com sucesso.\n\nNos vemos em breve!\n\n_PsicoGest_`
        );
    }
}

async function handleRescheduleRequest(appointmentId: string, phone: string, instanceName: string) {
    console.log('[WhatsApp Webhook] Processing reschedule request for appointment:', appointmentId);

    const supabase = await createClient();

    // Get appointment details
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
            *,
            patients(full_name, phone),
            professionals(id, full_name, phone)
        `)
        .eq('id', appointmentId)
        .single();

    if (error || !appointment) {
        console.error('[WhatsApp Webhook] Error fetching appointment:', error);
        return;
    }

    // Update status to indicate reschedule requested
    await supabase
        .from('appointments')
        .update({
            status: 'pending',
            notes: `${appointment.notes || ''}\n[REAGENDAMENTO SOLICITADO via WhatsApp em ${new Date().toLocaleString('pt-BR')}]`.trim(),
        })
        .eq('id', appointmentId);

    // Send message to patient
    if (appointment.professionals?.id) {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client');
        
        await sendWhatsAppMessage(
            appointment.professionals.id,
            phone,
            `📅 *Solicitação de Reagendamento*\n\nRecebemos seu pedido de reagendamento, ${appointment.patients?.full_name}.\n\nEntraremos em contato em breve para agendar um novo horário.\n\n_PsicoGest_`
        );
    }

    // Optionally notify the professional
    // You could send an email or push notification here
}

async function handleTextConfirmation(phone: string, instanceName: string) {
    console.log('[WhatsApp Webhook] Processing text confirmation from:', phone);

    const supabase = await createClient();

    // Find the most recent pending/scheduled appointment for this phone
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            *,
            patients!inner(full_name, phone),
            professionals(id, full_name)
        `)
        .eq('patients.phone', phone)
        .in('status', ['scheduled', 'pending'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1);

    if (error || !appointments?.length) {
        console.log('[WhatsApp Webhook] No pending appointments found for phone:', phone);
        return;
    }

    const appointment = appointments[0];

    // Confirm the appointment
    await supabase
        .from('appointments')
        .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_via: 'whatsapp_text',
        })
        .eq('id', appointment.id);

    // Send confirmation
    if (appointment.professionals?.id) {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client');
        
        await sendWhatsAppMessage(
            appointment.professionals.id,
            phone,
            `✅ *Consulta Confirmada!*\n\nObrigado! Sua consulta foi confirmada.\n\n_PsicoGest_`
        );
    }
}


