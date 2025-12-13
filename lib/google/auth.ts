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
        prompt: "consent", // Force to get refresh token
        state: state || "",
    });
}

export async function getTokensFromCode(code: string) {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
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

