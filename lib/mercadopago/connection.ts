import { isEncryptionEnabled, isSealedText, openText, sealText } from "@/lib/crypto/sensitive";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MpTokenResponse } from "@/lib/mercadopago/oauth";

export type MercadoPagoConnectionStatus = {
    connected: boolean;
    mpUserId?: string;
    liveMode?: boolean;
    connectedAt?: string;
};

export type MercadoPagoConnectionSecrets = {
    professionalId: string;
    mpUserId: string;
    accessToken: string;
    refreshToken: string | null;
    publicKey: string | null;
    liveMode: boolean;
    tokenExpiresAt: string | null;
};

function requireSealed(value: string, label: string): string {
    const sealed = sealText(value);
    if (!sealed) {
        throw new Error(`Não foi possível guardar ${label} do Mercado Pago`);
    }
    return sealed;
}

function openSecret(value: string | null | undefined, label: string): string | null {
    if (value == null || value === "") return null;
    if (isSealedText(value) && !isEncryptionEnabled()) {
        throw new Error(`RECORDS_ENCRYPTION_KEY ausente para decifrar ${label}`);
    }
    return openText(value);
}

export async function getMercadoPagoConnectionStatus(
    professionalId: string
): Promise<MercadoPagoConnectionStatus> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("mercadopago_connections")
        .select("mp_user_id, live_mode, connected_at")
        .eq("professional_id", professionalId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        return { connected: false };
    }

    return {
        connected: true,
        mpUserId: data.mp_user_id,
        liveMode: data.live_mode,
        connectedAt: data.connected_at,
    };
}

export async function saveMercadoPagoConnection(
    professionalId: string,
    token: MpTokenResponse
): Promise<void> {
    const supabase = await createClient();
    const expiresAt =
        typeof token.expires_in === "number"
            ? new Date(Date.now() + token.expires_in * 1000).toISOString()
            : null;

    const { error } = await supabase.rpc("save_my_mercadopago_connection", {
        p_professional_id: professionalId,
        p_mp_user_id: String(token.user_id),
        p_access_token: requireSealed(token.access_token, "access_token"),
        p_refresh_token: token.refresh_token
            ? requireSealed(token.refresh_token, "refresh_token")
            : null,
        p_public_key: token.public_key ?? null,
        p_live_mode: Boolean(token.live_mode),
        p_scope: token.scope ?? null,
        p_token_expires_at: expiresAt,
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function deleteMercadoPagoConnection(professionalId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_my_mercadopago_connection", {
        p_professional_id: professionalId,
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function getMercadoPagoConnectionSecrets(
    professionalId: string
): Promise<MercadoPagoConnectionSecrets | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("mercadopago_connections")
        .select(
            "professional_id, mp_user_id, access_token, refresh_token, public_key, live_mode, token_expires_at"
        )
        .eq("professional_id", professionalId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) return null;

    const accessToken = openSecret(data.access_token, "access_token");
    if (!accessToken) {
        throw new Error("Token do Mercado Pago inválido");
    }

    return {
        professionalId: data.professional_id,
        mpUserId: data.mp_user_id,
        accessToken,
        refreshToken: openSecret(data.refresh_token, "refresh_token"),
        publicKey: data.public_key,
        liveMode: data.live_mode,
        tokenExpiresAt: data.token_expires_at,
    };
}
