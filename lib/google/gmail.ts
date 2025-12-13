import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: {
        name: string;
        email: string;
    };
}

export async function sendEmail(
    refreshToken: string,
    options: EmailOptions
): Promise<{ success: boolean; messageId?: string }> {
    try {
        const auth = getAuthenticatedClient(refreshToken);
        const gmail = google.gmail({ version: "v1", auth });

        // Get user's email if not provided
        let fromEmail = options.from?.email;
        if (!fromEmail) {
            const profile = await gmail.users.getProfile({ userId: "me" });
            fromEmail = profile.data.emailAddress || "";
        }

        const fromName = options.from?.name || "";
        const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

        // Create email in RFC 2822 format
        const emailLines = [
            `From: ${fromHeader}`,
            `To: ${options.to}`,
            `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`,
            "MIME-Version: 1.0",
            'Content-Type: text/html; charset="UTF-8"',
            "",
            options.html,
        ];

        const email = emailLines.join("\r\n");
        const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedEmail,
            },
        });

        return {
            success: true,
            messageId: response.data.id || undefined,
        };
    } catch (error) {
        console.error("Error sending email via Gmail:", error);
        return { success: false };
    }
}

export function generateReminderEmailHtml(data: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    type: "in_person" | "telehealth";
    confirmationLink: string;
}): string {
    const typeText = data.type === "telehealth" ? "Online" : "Presencial";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Lembrete de Sessão</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Olá <strong>${data.patientName}</strong>! 👋
        </p>
        
        <p style="margin-bottom: 20px;">
            Este é um lembrete da sua sessão agendada com <strong>${data.professionalName}</strong>.
        </p>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 10px;">📅</span>
                <span><strong>${data.date}</strong></span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 10px;">🕐</span>
                <span><strong>${data.time}</strong></span>
            </div>
            <div style="display: flex; align-items: center;">
                <span style="font-size: 20px; margin-right: 10px;">📍</span>
                <span><strong>${typeText}</strong></span>
            </div>
        </div>
        
        <p style="margin-bottom: 20px;">
            Por favor, confirme sua presença clicando no botão abaixo:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.confirmationLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ✓ Confirmar Presença
            </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Se precisar reagendar, entre em contato diretamente com o profissional.
        </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p>Enviado por PsicoGest</p>
    </div>
</body>
</html>
    `.trim();
}

export function generateMeetLinkEmailHtml(data: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    meetLink: string;
}): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Sessão Confirmada!</h1>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
        <p style="font-size: 16px; margin-bottom: 20px;">
            Olá <strong>${data.patientName}</strong>! 👋
        </p>
        
        <p style="margin-bottom: 20px;">
            Sua sessão com <strong>${data.professionalName}</strong> foi confirmada!
        </p>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 10px;">📅</span>
                <span><strong>${data.date}</strong></span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; margin-right: 10px;">🕐</span>
                <span><strong>${data.time}</strong></span>
            </div>
            <div style="display: flex; align-items: center;">
                <span style="font-size: 20px; margin-right: 10px;">💻</span>
                <span><strong>Online (Google Meet)</strong></span>
            </div>
        </div>
        
        <p style="margin-bottom: 20px;">
            Clique no botão abaixo para entrar na reunião no horário agendado:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.meetLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                🎥 Entrar na Reunião
            </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
            Link da reunião: <a href="${data.meetLink}" style="color: #6366f1;">${data.meetLink}</a>
        </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
        <p>Enviado por PsicoGest</p>
    </div>
</body>
</html>
    `.trim();
}

