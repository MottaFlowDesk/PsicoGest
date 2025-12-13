// WhatsApp Client - Stub Implementation
// Note: Baileys has incompatibility with Turbopack.
// This is a stub that can be replaced with a proper implementation
// when deploying to production with a backend service.

// Store active connections (in-memory for development)
const connections: Map<string, {
    qrCode: string | null;
    status: "connecting" | "connected" | "disconnected";
    phone: string | null;
}> = new Map();

export async function connectWhatsApp(professionalId: string): Promise<{
    qrCode?: string;
    connected?: boolean;
    phone?: string;
    error?: string;
}> {
    // Stub: Return a mock QR code for development
    // In production, this would connect to a WhatsApp service
    
    const mockQR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    connections.set(professionalId, {
        qrCode: mockQR,
        status: "connecting",
        phone: null,
    });

    return { qrCode: mockQR };
}

export async function getWhatsAppStatus(professionalId: string): Promise<{
    connected: boolean;
    phone: string | null;
    qrCode: string | null;
}> {
    const conn = connections.get(professionalId);
    
    return {
        connected: conn?.status === "connected",
        phone: conn?.phone || null,
        qrCode: conn?.qrCode || null,
    };
}

export async function disconnectWhatsApp(professionalId: string): Promise<void> {
    connections.delete(professionalId);
}

export async function sendWhatsAppMessage(
    professionalId: string,
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    const conn = connections.get(professionalId);
    
    if (!conn || conn.status !== "connected") {
        // In development, just log the message
        console.log(`[WhatsApp Stub] Would send to ${phone}:`, message);
        return { success: true };
    }

    // Stub: Log the message instead of actually sending
    console.log(`[WhatsApp] Sending to ${phone}:`, message);
    return { success: true };
}

export function generateReminderMessage(data: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    type: "in_person" | "telehealth";
    confirmationLink: string;
}): string {
    const greeting = getGreeting();
    const typeText = data.type === "telehealth" ? "Online" : "Presencial";

    return `${greeting} ${data.patientName}! 👋

Lembrete: Você tem uma sessão agendada para amanhã.

📅 ${data.date}
🕐 ${data.time}
📍 ${typeText}

Confirme sua presença clicando no link abaixo:
${data.confirmationLink}

Caso precise reagendar, entre em contato.

${data.professionalName}
_PsicoGest_`;
}

export function generateMeetLinkMessage(data: {
    patientName: string;
    date: string;
    time: string;
    meetLink: string;
}): string {
    return `✅ Sessão Confirmada!

Olá ${data.patientName}!

Sua sessão foi confirmada para:
📅 ${data.date}
🕐 ${data.time}

🎥 Link da reunião:
${data.meetLink}

Clique no link acima no horário agendado para entrar.

_PsicoGest_`;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}
