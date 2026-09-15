import {
    getMpClientId,
    getMpClientSecret,
    getMpRedirectUri,
    MP_AUTHORIZATION_URL,
    MP_TOKEN_URL,
    useMpTestToken,
} from "@/lib/mercadopago/config";

export type MpTokenResponse = {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    user_id: number | string;
    refresh_token?: string;
    public_key?: string;
    live_mode?: boolean;
};

export class MercadoPagoOAuthError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string
    ) {
        super(message);
        this.name = "MercadoPagoOAuthError";
    }
}

export function buildAuthorizationUrl(params: {
    state: string;
    codeChallenge: string;
}): string {
    const url = new URL(MP_AUTHORIZATION_URL);
    url.searchParams.set("client_id", getMpClientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("state", params.state);
    url.searchParams.set("redirect_uri", getMpRedirectUri());
    url.searchParams.set("code_challenge", params.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
}

async function requestToken(body: Record<string, unknown>): Promise<MpTokenResponse> {
    const response = await fetch(MP_TOKEN_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as
        | (Partial<MpTokenResponse> & { error?: string; message?: string; error_description?: string })
        | null;

    if (!response.ok || !payload?.access_token || payload.user_id == null) {
        const code = payload?.error ?? `http_${response.status}`;
        const message =
            payload?.message ||
            payload?.error_description ||
            "Falha ao obter o token do Mercado Pago";
        throw new MercadoPagoOAuthError(message, response.status, code);
    }

    return payload as MpTokenResponse;
}

export async function exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
}): Promise<MpTokenResponse> {
    const body: Record<string, unknown> = {
        client_id: getMpClientId(),
        client_secret: getMpClientSecret(),
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: getMpRedirectUri(),
        code_verifier: params.codeVerifier,
    };

    if (useMpTestToken()) {
        body.test_token = true;
    }

    return requestToken(body);
}

export async function refreshAccessToken(refreshToken: string): Promise<MpTokenResponse> {
    const body: Record<string, unknown> = {
        client_id: getMpClientId(),
        client_secret: getMpClientSecret(),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    };

    if (useMpTestToken()) {
        body.test_token = true;
    }

    return requestToken(body);
}
