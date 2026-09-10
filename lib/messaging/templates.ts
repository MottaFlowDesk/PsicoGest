/**
 * Templates UTILITY aprovados na WABA da plataforma.
 *
 * O corpo do texto vive na Meta (não no código): aqui só montamos as variáveis
 * na ordem exata em que o template foi cadastrado. Se você renomear os
 * templates no Business Manager, ajuste as envs META_TEMPLATE_*.
 */
import type { TemplateComponent } from "@/lib/messaging/meta-cloud";

export type MessageKind =
    | "confirmation"
    | "reminder_24h"
    | "reminder_2h"
    | "meet_link";

const TEMPLATE_ENV: Record<MessageKind, { env: string; fallback: string | null }> = {
    confirmation: {
        env: "META_TEMPLATE_CONFIRMATION",
        fallback: "appointment_confirmation",
    },
    reminder_24h: {
        env: "META_TEMPLATE_REMINDER_24H",
        fallback: "appointment_reminder_24h",
    },
    reminder_2h: {
        env: "META_TEMPLATE_REMINDER_2H",
        fallback: "appointment_reminder_2h",
    },
    // Sem fallback: só envia no WhatsApp se o template estiver cadastrado
    meet_link: { env: "META_TEMPLATE_MEET_LINK", fallback: null },
};

export function getTemplateName(kind: MessageKind): string | null {
    const config = TEMPLATE_ENV[kind];
    return process.env[config.env]?.trim() || config.fallback;
}

export function getTemplateLanguage(): string {
    return process.env.META_TEMPLATE_LANGUAGE?.trim() || "pt_BR";
}

export interface AppointmentTemplateVars {
    patientName: string;
    professionalName: string;
    /** Ex.: "quinta-feira, 12 de março" */
    date: string;
    /** Ex.: "14:30" */
    time: string;
    type: "in_person" | "telehealth";
    /** Sufixo dinâmico do botão URL do template (token ou caminho curto). */
    urlSuffix: string;
}

export function describeAppointmentType(type: "in_person" | "telehealth"): string {
    return type === "telehealth" ? "online" : "presencial";
}

/**
 * Componentes do template: 5 variáveis no corpo + sufixo do botão URL.
 *
 * Corpo cadastrado na Meta:
 *   {{1}} paciente · {{2}} profissional · {{3}} data · {{4}} hora · {{5}} modalidade
 * Botão URL cadastrado na Meta:
 *   https://SEU_DOMINIO/confirm/{{1}}
 */
export function buildAppointmentComponents(
    vars: AppointmentTemplateVars
): TemplateComponent[] {
    return [
        {
            type: "body",
            parameters: [
                { type: "text", text: vars.patientName },
                { type: "text", text: vars.professionalName },
                { type: "text", text: vars.date },
                { type: "text", text: vars.time },
                { type: "text", text: describeAppointmentType(vars.type) },
            ],
        },
        {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: vars.urlSuffix }],
        },
    ];
}

/**
 * Meet link tem corpo próprio: paciente, profissional, data, hora e o
 * sufixo do botão aponta para a videochamada.
 */
export function buildMeetLinkComponents(vars: {
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    urlSuffix: string;
}): TemplateComponent[] {
    return [
        {
            type: "body",
            parameters: [
                { type: "text", text: vars.patientName },
                { type: "text", text: vars.professionalName },
                { type: "text", text: vars.date },
                { type: "text", text: vars.time },
            ],
        },
        {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: vars.urlSuffix }],
        },
    ];
}
