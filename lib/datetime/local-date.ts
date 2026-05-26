/**
 * Utilitários de data/hora para o fuso America/Sao_Paulo (UTC-3).
 * Evita o bug de <input type="date">.valueAsDate que usa meia-noite UTC.
 *
 * No Supabase, `scheduled_at` aparece em UTC (+00). Ex.: 14:00 UTC = 11:00 em SP.
 */

export const APP_TIMEZONE = "America/Sao_Paulo";
export const APP_TIMEZONE_OFFSET = "-03:00";

/** Converte YYYY-MM-DD em Date à meia-noite no fuso local do navegador */
export function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Date → YYYY-MM-DD no fuso local do navegador */
export function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Monta timestamp de agendamento em America/Sao_Paulo (uso no servidor) */
export function buildAppointmentTimestamp(dateStr: string, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    return new Date(`${dateStr}T${hh}:${mm}:00${APP_TIMEZONE_OFFSET}`);
}

/** Início e fim do dia em ISO para consultas no Supabase */
export function getDayBoundsISO(dateStr: string): { start: string; end: string } {
    return {
        start: `${dateStr}T00:00:00${APP_TIMEZONE_OFFSET}`,
        end: `${dateStr}T23:59:59.999${APP_TIMEZONE_OFFSET}`,
    };
}

/** Início do dia local (navegador) a partir de Date ou string */
export function startOfLocalDay(date: Date | string): Date {
    if (typeof date === "string") {
        return parseLocalDate(date);
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** Data de hoje em YYYY-MM-DD (America/Sao_Paulo) */
export function getTodayDateString(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Horário local (HH:mm) a partir de um ISO gravado no banco */
export function getLocalTimeFromISO(iso: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: APP_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(iso));
}

/** Data local (YYYY-MM-DD) a partir de um ISO gravado no banco */
export function getLocalDateFromISO(iso: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(iso));
}

/** Limites de um intervalo de visualização do calendário (dia/semana/mês) em SP */
export function getCalendarViewBoundsISO(
    viewDate: Date,
    viewType: "day" | "week" | "month"
): { start: string; end: string } {
    const anchor = toDateInputValue(viewDate);

    if (viewType === "day") {
        return getDayBoundsISO(anchor);
    }

    const [y, m, d] = anchor.split("-").map(Number);
    const anchorDate = new Date(y, m - 1, d);

    if (viewType === "week") {
        const day = anchorDate.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(anchorDate);
        monday.setDate(anchorDate.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            start: `${toDateInputValue(monday)}T00:00:00${APP_TIMEZONE_OFFSET}`,
            end: `${toDateInputValue(sunday)}T23:59:59.999${APP_TIMEZONE_OFFSET}`,
        };
    }

    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return {
        start: `${toDateInputValue(first)}T00:00:00${APP_TIMEZONE_OFFSET}`,
        end: `${toDateInputValue(last)}T23:59:59.999${APP_TIMEZONE_OFFSET}`,
    };
}

/** Fim do dia local (navegador) */
export function endOfLocalDay(date: Date | string): Date {
    const base =
        typeof date === "string"
            ? parseLocalDate(date)
            : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        23,
        59,
        59,
        999
    );
}
