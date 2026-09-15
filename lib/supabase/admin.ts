import { createClient } from "@supabase/supabase-js";

function normalizeEnv(value: string | undefined): string | undefined {
    const trimmed = value?.trim().replace(/^["']|["']$/g, "");
    return trimmed || undefined;
}

/** Cliente com service role — apenas em rotas de servidor (cron, confirmação pública, etc.) */
export function createAdminClient() {
    const url = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const key =
        normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ??
        normalizeEnv(process.env.SUPABASE_SECRET_KEY);

    if (!url || !key) {
        throw new Error("Supabase admin não configurado (URL ou SERVICE_ROLE_KEY)");
    }

    const isModernSecret = key.startsWith("sb_secret_");

    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
            fetch: (input, init = {}) => {
                const headers = new Headers(init.headers);
                headers.set("apikey", key);
                if (isModernSecret) {
                    headers.delete("Authorization");
                } else if (!headers.get("Authorization")) {
                    headers.set("Authorization", `Bearer ${key}`);
                }
                return fetch(input, { ...init, headers });
            },
        },
    });
}
