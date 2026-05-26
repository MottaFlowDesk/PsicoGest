/**
 * Converte action_url salvo no banco para navegação interna (caminho relativo).
 * URLs absolutas com host diferente (ex.: localhost vs IP da rede) causam perda de sessão.
 */
export function normalizeNotificationActionUrl(
    actionUrl: string | null | undefined
): string | null {
    if (!actionUrl?.trim()) return null;

    const trimmed = actionUrl.trim();

    if (trimmed.startsWith("/")) {
        return resolveLegacyAppointmentPath(trimmed);
    }

    try {
        const url = new URL(trimmed);
        const path = url.pathname + url.search + url.hash;
        return resolveLegacyAppointmentPath(path);
    } catch {
        return null;
    }
}

/** Rota antiga /dashboard/appointments/:id não existe — redireciona ao calendário */
function resolveLegacyAppointmentPath(path: string): string {
    if (/^\/dashboard\/appointments\/[0-9a-f-]{36}$/i.test(path)) {
        return "/dashboard/calendar";
    }
    return path;
}
