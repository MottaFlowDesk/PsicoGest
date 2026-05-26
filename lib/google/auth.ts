import { google } from "googleapis";

const SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
        `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

    if (!clientId || !clientSecret) {
        throw new Error("Google OAuth not configured");
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state?: string): string {
    const oauth2Client = getGoogleOAuthClient();
    
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        include_granted_scopes: true,
        state: state || "",
    });
}

export async function getTokensFromCode(code: string) {
    const oauth2Client = getGoogleOAuthClient();
    const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

    const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: redirectUri,
    });
    return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
}

export function getAuthenticatedClient(refreshToken: string) {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
}

/** Renova access token e aplica credenciais completas (necessário para Gmail API). */
export async function getOAuth2ClientWithFreshTokens(refreshToken: string) {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
        throw new Error("Não foi possível renovar o token de acesso do Google");
    }

    oauth2Client.setCredentials({
        refresh_token: refreshToken,
        access_token: credentials.access_token,
        scope: credentials.scope,
        token_type: credentials.token_type ?? "Bearer",
        expiry_date: credentials.expiry_date,
    });

    return { oauth2Client, scope: credentials.scope ?? "" };
}

export async function revokeGoogleRefreshToken(refreshToken: string): Promise<void> {
    try {
        await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: refreshToken }),
        });
    } catch (error) {
        console.error("Error revoking Google token:", error);
    }
}

export function tokenScopeIncludesGmailSend(scope?: string | null): boolean {
    if (!scope) return false;
    return (
        scope.includes("gmail.send") ||
        scope.includes("https://mail.google.com/")
    );
}

export async function getUserEmail(refreshToken: string): Promise<string | null> {
    try {
        const oauth2Client = getAuthenticatedClient(refreshToken);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        return data.email || null;
    } catch (error) {
        console.error("Error getting user email:", error);
        return null;
    }
}

export function isGoogleConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

function parseScopeString(scope?: string | null): string[] {
    return (scope || "").split(/\s+/).filter(Boolean);
}

/** Escopos do token (resposta do refresh; não usa tokeninfo, que gera falsos negativos). */
export async function getGrantedScopes(refreshToken: string): Promise<string[]> {
    try {
        const credentials = await refreshAccessToken(refreshToken);
        return parseScopeString(credentials.scope);
    } catch (error) {
        console.error("Error reading token scopes:", error);
        return [];
    }
}

export async function hasGmailSendScope(refreshToken: string): Promise<boolean> {
    const scopes = await getGrantedScopes(refreshToken);
    if (scopes.length === 0) {
        // Escopo não retornado no refresh: não bloquear — validar no envio real
        return true;
    }
    return scopes.some(
        (s) =>
            s === GMAIL_SEND_SCOPE ||
            s.includes("gmail.send") ||
            s === "https://mail.google.com/"
    );
}

