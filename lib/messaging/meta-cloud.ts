/**
 * Client da WhatsApp Cloud API (Meta) — WABA única da plataforma.
 *
 * Diferente da Evolution API, aqui não existe QR code por profissional:
 * todas as mensagens saem do número oficial do PsicoGuest e só podem usar
 * templates UTILITY previamente aprovados pela Meta.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v21.0";

export interface TemplateParameter {
    type: "text";
    text: string;
}

export interface TemplateComponent {
    type: "body" | "header" | "button";
    sub_type?: "url" | "quick_reply";
    index?: string;
    parameters: TemplateParameter[];
}

export interface SendTemplateResult {
    success: boolean;
    messageId?: string;
    error?: string;
    /** Falhas temporárias (rate limit, indisponibilidade) devem ser reprocessadas. */
    retryable?: boolean;
}

/**
 * Códigos de erro da Meta que valem nova tentativa. Todo o resto
 * (template inexistente, número inválido, parâmetro errado) é definitivo.
 */
const RETRYABLE_META_CODES = new Set([
    130429, // rate limit atingido
    131048, // limite de spam do número
    131056, // pair rate limit
    133016, // conta temporariamente bloqueada
    368, // restrição temporária
    1, // erro interno da API
    2, // serviço temporariamente indisponível
    4, // limite de chamadas da aplicação
    80007, // rate limit da WABA
]);

export function isPlatformWhatsAppEnabled(): boolean {
    return (
        process.env.WHATSAPP_PLATFORM_ENABLED === "true" &&
        !!process.env.META_PHONE_NUMBER_ID?.trim() &&
        !!process.env.META_ACCESS_TOKEN?.trim()
    );
}

/**
 * Motivo pelo qual o canal WhatsApp da plataforma está indisponível,
 * ou null quando está pronto para uso.
 */
export function getPlatformWhatsAppDisabledReason(): string | null {
    if (process.env.WHATSAPP_PLATFORM_ENABLED !== "true") {
        return "WHATSAPP_PLATFORM_ENABLED não está definido como 'true'";
    }
    if (!process.env.META_PHONE_NUMBER_ID?.trim()) {
        return "META_PHONE_NUMBER_ID não configurado";
    }
    if (!process.env.META_ACCESS_TOKEN?.trim()) {
        return "META_ACCESS_TOKEN não configurado";
    }
    return null;
}

/**
 * Converte telefone brasileiro para o formato aceito pela Meta (dígitos, com DDI).
 * Retorna null quando o número não passa da validação E.164.
 */
export function toMetaPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;

    let digits = phone.replace(/\D/g, "");

    while (digits.startsWith("0")) {
        digits = digits.slice(1);
    }

    // Número nacional (10 ou 11 dígitos) recebe DDI do Brasil
    if (digits.length === 10 || digits.length === 11) {
        digits = `55${digits}`;
    }

    if (!/^[1-9]\d{10,14}$/.test(digits)) {
        return null;
    }

    return digits;
}

export function toE164(phone: string | null | undefined): string | null {
    const digits = toMetaPhone(phone);
    return digits ? `+${digits}` : null;
}

/**
 * Envia um template aprovado para um número.
 */
export async function sendTemplate(params: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: TemplateComponent[];
}): Promise<SendTemplateResult> {
    const disabledReason = getPlatformWhatsAppDisabledReason();
    if (disabledReason) {
        return { success: false, error: disabledReason, retryable: false };
    }

    const to = toMetaPhone(params.to);
    if (!to) {
        return { success: false, error: "Telefone inválido para E.164", retryable: false };
    }

    const phoneNumberId = process.env.META_PHONE_NUMBER_ID!.trim();
    const accessToken = process.env.META_ACCESS_TOKEN!.trim();
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

    const body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
            name: params.templateName,
            language: { code: params.languageCode || "pt_BR" },
            ...(params.components?.length ? { components: params.components } : {}),
        },
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            const messageId = data?.messages?.[0]?.id as string | undefined;
            return { success: true, messageId };
        }

        const code = Number(data?.error?.code);
        const subcode = Number(data?.error?.error_subcode);
        const detail =
            data?.error?.error_data?.details ||
            data?.error?.message ||
            `HTTP ${response.status}`;

        return {
            success: false,
            error: `Meta [${code || response.status}] ${detail}`,
            retryable:
                RETRYABLE_META_CODES.has(code) ||
                RETRYABLE_META_CODES.has(subcode) ||
                response.status === 429 ||
                response.status >= 500,
        };
    } catch (error) {
        // Falha de rede: sempre vale nova tentativa
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro de rede na Meta Cloud API",
            retryable: true,
        };
    }
}

/**
 * Envia texto livre. Só funciona dentro da janela de 24h de atendimento
 * (ou seja, quando o paciente escreveu primeiro) — fora dela use sendTemplate.
 */
export async function sendText(params: {
    to: string;
    text: string;
}): Promise<SendTemplateResult> {
    const disabledReason = getPlatformWhatsAppDisabledReason();
    if (disabledReason) {
        return { success: false, error: disabledReason, retryable: false };
    }

    const to = toMetaPhone(params.to);
    if (!to) {
        return { success: false, error: "Telefone inválido para E.164", retryable: false };
    }

    const phoneNumberId = process.env.META_PHONE_NUMBER_ID!.trim();
    const accessToken = process.env.META_ACCESS_TOKEN!.trim();

    try {
        const response = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to,
                    type: "text",
                    text: { preview_url: true, body: params.text },
                }),
            }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            return { success: true, messageId: data?.messages?.[0]?.id };
        }

        return {
            success: false,
            error: data?.error?.message || `HTTP ${response.status}`,
            retryable: response.status === 429 || response.status >= 500,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro de rede na Meta Cloud API",
            retryable: true,
        };
    }
}

/**
 * Marca a mensagem como lida — usado pelo webhook para não deixar
 * respostas de texto do paciente sem leitura.
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
    if (getPlatformWhatsAppDisabledReason()) return;

    const phoneNumberId = process.env.META_PHONE_NUMBER_ID!.trim();
    const accessToken = process.env.META_ACCESS_TOKEN!.trim();

    try {
        await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    status: "read",
                    message_id: messageId,
                }),
            }
        );
    } catch (error) {
        console.error("[Meta Cloud] markMessageAsRead:", error);
    }
}
