import { openText } from "@/lib/crypto/sensitive";
import { getCurrentProfessionalId } from "@/lib/mercadopago/current-professional";
import {
    getMercadoPagoConnectionSecrets,
    saveMercadoPagoConnection,
    type MercadoPagoConnectionSecrets,
} from "@/lib/mercadopago/connection";
import { refreshAccessToken } from "@/lib/mercadopago/oauth";
import { createClient } from "@/lib/supabase/server";

function mapSecretRow(data: {
    professional_id: string;
    mp_user_id: string;
    access_token: string;
    refresh_token: string | null;
    public_key: string | null;
    live_mode: boolean;
    token_expires_at: string | null;
}): MercadoPagoConnectionSecrets {
    const accessToken = openText(data.access_token);
    if (!accessToken) {
        throw new Error("Token do Mercado Pago inválido");
    }

    return {
        professionalId: data.professional_id,
        mpUserId: data.mp_user_id,
        accessToken,
        refreshToken: openText(data.refresh_token),
        publicKey: data.public_key,
        liveMode: data.live_mode,
        tokenExpiresAt: data.token_expires_at,
    };
}

async function getSecretsForLoggedProfessional(
    professionalId: string
): Promise<MercadoPagoConnectionSecrets | null> {
    const identity = await getCurrentProfessionalId();
    if ("error" in identity || identity.professionalId !== professionalId) {
        return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_mercadopago_secrets");
    if (error) {
        throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return mapSecretRow(row);
}

export async function getSellerConnectionForInvoice(
    professionalId: string
): Promise<MercadoPagoConnectionSecrets | null> {
    const fromSession = await getSecretsForLoggedProfessional(professionalId).catch(() => null);
    if (fromSession) {
        return refreshIfNeeded(fromSession);
    }

    try {
        const fromAdmin = await getMercadoPagoConnectionSecrets(professionalId);
        return fromAdmin ? refreshIfNeeded(fromAdmin) : null;
    } catch (error) {
        console.error("Admin Mercado Pago secrets failed:", error);
        return null;
    }
}

async function refreshIfNeeded(
    connection: MercadoPagoConnectionSecrets
): Promise<MercadoPagoConnectionSecrets> {
    if (!connection.refreshToken || !connection.tokenExpiresAt) {
        return connection;
    }

    const expiresAt = Date.parse(connection.tokenExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt - Date.now() > 60_000) {
        return connection;
    }

    const token = await refreshAccessToken(connection.refreshToken);
    await saveMercadoPagoConnection(connection.professionalId, token).catch((error) => {
        console.error("Failed to persist refreshed Mercado Pago token:", error);
    });

    return {
        ...connection,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? connection.refreshToken,
    };
}
