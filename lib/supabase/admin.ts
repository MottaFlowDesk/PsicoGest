import { createClient } from "@supabase/supabase-js";

/** Cliente com service role — apenas em rotas de servidor (cron, confirmação pública, etc.) */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Supabase admin não configurado (URL ou SERVICE_ROLE_KEY)");
    }

    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
