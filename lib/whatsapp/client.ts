// WhatsApp Client - Integração com Evolution API
const EVOLUTION_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'https://exemplary-flow-production-e901.up.railway.app';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'psicogest_evo_2024_secret';

console.log('[WhatsApp Client] URL:', EVOLUTION_API_URL);
console.log('[WhatsApp Client] Key (first 5 chars):', EVOLUTION_API_KEY?.substring(0, 5));

export interface WhatsAppStatus {
    connected: boolean;
    initialized: boolean;
    phone?: string;
    instanceName?: string;
}

export interface QRCodeResponse {
    success: boolean;
    qrCode?: string;
    connected?: boolean;
    message?: string;
    error?: string;
    pairingCode?: string;
}

export interface SendMessageResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface ButtonMessage {
    title: string;
    description: string;
    footer?: string;
    buttons: Array<{
        type: 'reply';
        displayText: string;
        id: string;
    }>;
}

const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'apikey': EVOLUTION_API_KEY,
};

/**
 * Create instance for a professional
 */
export async function createInstance(professionalId: string): Promise<{ success: boolean; instanceName?: string; error?: string }> {
    try {
        const instanceName = `psicogest_${professionalId.replace(/-/g, '_').substring(0, 20)}`;
        
        console.log('[Evolution API] Creating instance:', instanceName);
        console.log('[Evolution API] URL:', `${EVOLUTION_API_URL}/instance/create`);
        
        const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                instanceName,
                integration: 'WHATSAPP-BAILEYS',
                qrcode: true,
                rejectCall: true,
                groupsIgnore: true,
                alwaysOnline: false,
                readMessages: false,
                readStatus: false,
                syncFullHistory: false,
            }),
        });
        
        const data = await response.json();
        console.log('[Evolution API] Create response status:', response.status);
        console.log('[Evolution API] Create response:', JSON.stringify(data));
        
        if (response.ok) {
            return { success: true, instanceName };
        }
        
        // Instance might already exist (check various response formats)
        const errorMessage = JSON.stringify(data).toLowerCase();
        if (errorMessage.includes('already') || response.status === 403) {
            console.log('[Evolution API] Instance already exists, continuing...');
            return { success: true, instanceName };
        }
        
        return { success: false, error: data.message || data.response?.message?.[0] || 'Failed to create instance' };
    } catch (error) {
        console.error('[Evolution API] Error creating instance:', error);
        return { success: false, error: 'Failed to connect to Evolution API' };
    }
}

/**
 * Get instance name for professional
 */
function getInstanceName(professionalId: string): string {
    return `psicogest_${professionalId.replace(/-/g, '_').substring(0, 20)}`;
}

/**
 * Get QR Code for WhatsApp connection
 */
export async function getWhatsAppQRCode(professionalId: string): Promise<QRCodeResponse> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        // First, try to create/ensure instance exists
        const createResult = await createInstance(professionalId);
        if (!createResult.success) {
            return { success: false, error: createResult.error };
        }
        
        // Connect instance to get QR code
        console.log('[Evolution API] Getting QR code for:', instanceName);
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers,
        });
        
        const data = await response.json();
        console.log('[Evolution API] Connect response status:', response.status);
        console.log('[Evolution API] Connect response:', JSON.stringify(data).substring(0, 500));
        
        if (data.base64) {
            console.log('[Evolution API] QR Code received!');
            // Evolution API already includes the data URI prefix
            const qrCode = data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
            return { 
                success: true, 
                qrCode,
                pairingCode: data.pairingCode 
            };
        }
        
        if (data.instance?.state === 'open') {
            console.log('[Evolution API] Already connected');
            return { success: true, connected: true, message: 'Already connected' };
        }
        
        console.log('[Evolution API] No QR code in response');
        return { success: false, error: data.message || 'Failed to get QR code' };
    } catch (error) {
        console.error('Error getting QR code:', error);
        return { success: false, error: 'Failed to connect to Evolution API' };
    }
}

/**
 * Check WhatsApp connection status
 */
export async function getWhatsAppStatus(professionalId: string): Promise<WhatsAppStatus> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers,
        });
        
        if (!response.ok) {
            return { connected: false, initialized: false };
        }
        
        const data = await response.json();
        
        return {
            connected: data.instance?.state === 'open',
            initialized: true,
            phone: data.instance?.owner?.split('@')[0],
            instanceName,
        };
    } catch (error) {
        console.error('Error getting status:', error);
        return { connected: false, initialized: false };
    }
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
    professionalId: string,
    phone: string,
    message: string
): Promise<SendMessageResponse> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        // Format phone number (remove non-digits, ensure country code)
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
        }
        
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                number: formattedPhone,
                text: message,
            }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.key?.id) {
            return { success: true, messageId: data.key.id };
        }
        
        return { success: false, error: data.message || 'Failed to send message' };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: 'Failed to send message' };
    }
}

/**
 * Send WhatsApp message with buttons (for appointment confirmation)
 */
export async function sendWhatsAppButtonMessage(
    professionalId: string,
    phone: string,
    buttonMessage: ButtonMessage
): Promise<SendMessageResponse> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        // Format phone number
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
        }

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendButtons/${instanceName}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                number: formattedPhone,
                title: buttonMessage.title,
                description: buttonMessage.description,
                footer: buttonMessage.footer || 'PsicoGest',
                buttons: buttonMessage.buttons,
            }),
        });
        
        const data = await response.json();
        console.log('[Evolution API] Button message response:', JSON.stringify(data));
        
        if (response.ok && data.key?.id) {
            return { success: true, messageId: data.key.id };
        }
        
        return { success: false, error: data.message || 'Failed to send button message' };
    } catch (error) {
        console.error('Error sending button message:', error);
        return { success: false, error: 'Failed to send button message' };
    }
}

/**
 * Send appointment reminder with confirmation link
 */
export async function sendAppointmentReminder(
    professionalId: string,
    phone: string,
    appointmentData: {
        patientName: string;
        professionalName: string;
        date: string;
        time: string;
        type: 'in_person' | 'telehealth';
        appointmentId: string;
        confirmationToken: string;
    }
): Promise<SendMessageResponse> {
    const { patientName, professionalName, date, time, type, confirmationToken } = appointmentData;
    const typeText = type === 'telehealth' ? 'online (teleconsulta)' : 'presencial';
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://psicogest.vercel.app';
    const confirmLink = `${baseUrl}/confirm/${confirmationToken}`;

    const message = `🔔 *Lembrete de Consulta*

Olá ${patientName}!

Você tem uma consulta ${typeText} agendada:

📅 *Data:* ${date}
⏰ *Horário:* ${time}
👨‍⚕️ *Profissional:* ${professionalName}

━━━━━━━━━━━━━━━━━━

✅ *Para CONFIRMAR*, clique no link:
${confirmLink}

📅 *Para REAGENDAR*, responda esta mensagem ou entre em contato.

━━━━━━━━━━━━━━━━━━
_PsicoGest - Gestão de Consultórios_`;

    return sendWhatsAppMessage(professionalId, phone, message);
}

/**
 * Disconnect WhatsApp
 */
export async function disconnectWhatsApp(professionalId: string): Promise<{ success: boolean }> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        // Logout from WhatsApp
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers,
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error disconnecting:', error);
        return { success: false };
    }
}

/**
 * Delete instance completely
 */
export async function deleteInstance(professionalId: string): Promise<{ success: boolean }> {
    try {
        const instanceName = getInstanceName(professionalId);
        
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers,
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting instance:', error);
        return { success: false };
    }
}

/**
 * Generate reminder message
 */
export function generateReminderMessage(params: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    type: 'in_person' | 'telehealth';
    confirmationLink: string;
}): string {
    const { patientName, professionalName, date, time, type, confirmationLink } = params;
    
    const typeText = type === 'telehealth' ? 'online' : 'presencial';
    
    return `Olá ${patientName}! 👋

🗓️ *Lembrete de Consulta*

Você tem uma consulta ${typeText} agendada:
📅 ${date}
⏰ ${time}
👨‍⚕️ ${professionalName}

Por favor, confirme sua presença clicando no link abaixo:
${confirmationLink}

_Responda SIM para confirmar ou entre em contato para reagendar._

PsicoGest - Gestão de Consultórios`;
}

/**
 * Generate Meet link message
 */
export function generateMeetLinkMessage(params: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    meetLink: string;
}): string {
    const { patientName, professionalName, date, time, meetLink } = params;
    
    return `Olá ${patientName}! 👋

✅ *Consulta Confirmada!*

Sua consulta online foi confirmada:
📅 ${date}
⏰ ${time}
👨‍⚕️ ${professionalName}

🔗 *Link da videochamada:*
${meetLink}

Acesse o link alguns minutos antes do horário.

PsicoGest - Gestão de Consultórios`;
}

/**
 * Connect WhatsApp (alias for getWhatsAppQRCode)
 */
export async function connectWhatsApp(professionalId: string): Promise<QRCodeResponse> {
    return getWhatsAppQRCode(professionalId);
}
