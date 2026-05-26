/**
 * URL pública do app (links em e-mails e WhatsApp).
 * Configure NEXT_PUBLIC_APP_URL com o endereço que o paciente acessa
 * (ex.: http://192.168.7.5:3000 ou https://seu-dominio.com).
 */
export function getPublicAppUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) {
        return configured.replace(/\/$/, "");
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
    }

    return "http://localhost:3000";
}

export function buildAppointmentConfirmationUrl(confirmationToken: string): string {
    return `${getPublicAppUrl()}/confirm/${confirmationToken}`;
}
