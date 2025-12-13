import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    ConnectionState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";
import pino from "pino";

// Store active connections
const connections: Map<string, {
    socket: WASocket;
    qrCode: string | null;
    status: "connecting" | "connected" | "disconnected";
    phone: string | null;
}> = new Map();

// Store pending QR code callbacks
const qrCallbacks: Map<string, (qr: string) => void> = new Map();

const logger = pino({ level: "silent" });

export async function connectWhatsApp(professionalId: string): Promise<{
    qrCode?: string;
    connected?: boolean;
    phone?: string;
    error?: string;
}> {
    try {
        // Check if already connected
        const existing = connections.get(professionalId);
        if (existing?.status === "connected") {
            return { connected: true, phone: existing.phone || undefined };
        }

        // Use in-memory auth state for simplicity
        // In production, you'd want to persist this to database
        const { state, saveCreds } = await useMultiFileAuthState(
            `./whatsapp-sessions/${professionalId}`
        );

        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ["PsicoGest", "Chrome", "1.0.0"],
        });

        // Store connection
        connections.set(professionalId, {
            socket,
            qrCode: null,
            status: "connecting",
            phone: null,
        });

        return new Promise((resolve) => {
            let qrResolved = false;

            socket.ev.on("creds.update", saveCreds);

            socket.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr && !qrResolved) {
                    // Generate QR code as data URL
                    const qrDataUrl = await QRCode.toDataURL(qr, {
                        width: 256,
                        margin: 2,
                    });

                    const conn = connections.get(professionalId);
                    if (conn) {
                        conn.qrCode = qrDataUrl;
                    }

                    // Check if there's a callback waiting for QR
                    const callback = qrCallbacks.get(professionalId);
                    if (callback) {
                        callback(qrDataUrl);
                        qrCallbacks.delete(professionalId);
                    }

                    if (!qrResolved) {
                        qrResolved = true;
                        resolve({ qrCode: qrDataUrl });
                    }
                }

                if (connection === "close") {
                    const shouldReconnect =
                        (lastDisconnect?.error as Boom)?.output?.statusCode !==
                        DisconnectReason.loggedOut;

                    const conn = connections.get(professionalId);
                    if (conn) {
                        conn.status = "disconnected";
                    }

                    if (shouldReconnect) {
                        // Attempt to reconnect
                        setTimeout(() => {
                            connectWhatsApp(professionalId);
                        }, 5000);
                    } else {
                        connections.delete(professionalId);
                    }
                }

                if (connection === "open") {
                    const conn = connections.get(professionalId);
                    if (conn) {
                        conn.status = "connected";
                        // Extract phone number from socket
                        const phone = socket.user?.id?.split(":")[0] || null;
                        conn.phone = phone;
                    }

                    if (!qrResolved) {
                        qrResolved = true;
                        resolve({ 
                            connected: true, 
                            phone: socket.user?.id?.split(":")[0] 
                        });
                    }
                }
            });
        });
    } catch (error: any) {
        console.error("WhatsApp connection error:", error);
        return { error: error.message };
    }
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
    const conn = connections.get(professionalId);
    if (conn?.socket) {
        await conn.socket.logout();
        conn.socket.end(undefined);
    }
    connections.delete(professionalId);
}

export async function sendWhatsAppMessage(
    professionalId: string,
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const conn = connections.get(professionalId);
        
        if (!conn || conn.status !== "connected") {
            return { success: false, error: "WhatsApp não conectado" };
        }

        // Format phone number (remove non-digits, ensure country code)
        let formattedPhone = phone.replace(/\D/g, "");
        if (!formattedPhone.startsWith("55")) {
            formattedPhone = "55" + formattedPhone;
        }
        
        const jid = formattedPhone + "@s.whatsapp.net";

        await conn.socket.sendMessage(jid, { text: message });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending WhatsApp message:", error);
        return { success: false, error: error.message };
    }
}

export function waitForQRCode(professionalId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Check if we already have a QR code
        const conn = connections.get(professionalId);
        if (conn?.qrCode) {
            resolve(conn.qrCode);
            return;
        }

        // Set up callback for when QR is generated
        const timeout = setTimeout(() => {
            qrCallbacks.delete(professionalId);
            reject(new Error("QR code timeout"));
        }, 30000);

        qrCallbacks.set(professionalId, (qr) => {
            clearTimeout(timeout);
            resolve(qr);
        });
    });
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

