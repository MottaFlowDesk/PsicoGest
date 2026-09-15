import { getPublicAppUrl } from "@/lib/app/public-url";

export const MP_OAUTH_COOKIE = "mp_oauth";
export const MP_OAUTH_COOKIE_MAX_AGE = 600;
export const MP_AUTHORIZATION_URL = "https://auth.mercadopago.com.br/authorization";
export const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

export function getMpClientId(): string {
    return process.env.MP_CLIENT_ID?.trim() ?? "";
}

export function getMpClientSecret(): string {
    return process.env.MP_CLIENT_SECRET?.trim() ?? "";
}

export function isMercadoPagoOAuthConfigured(): boolean {
    return Boolean(getMpClientId() && getMpClientSecret());
}

/** Redirect URI estática — precisa ser idêntica à cadastrada no app do Mercado Pago. */
export function getMpRedirectUri(): string {
    return `${getPublicAppUrl()}/api/mercadopago/connect/callback`;
}

/**
 * `test_token: true` devolve credenciais de teste.
 * Padrão: ligado fora de produção. Force com MP_OAUTH_TEST_TOKEN=true|false.
 */
export function useMpTestToken(): boolean {
    const raw = process.env.MP_OAUTH_TEST_TOKEN?.trim().toLowerCase();
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return process.env.NODE_ENV !== "production";
}
