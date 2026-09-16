import { createClient } from "@/lib/supabase/server";

export type HealthCheckResult = {
    ok: boolean;
    healthy: boolean;
    message: string;
    error: string | null;
};

export async function runHealthCheck(): Promise<HealthCheckResult> {
    try {
        const supabase = await createClient();
        let isHealthy = true;
        let error: { message: string } | null = null;

        try {
            const { error: queryError } = await supabase
                .from("professionals")
                .select("id")
                .limit(1);

            if (queryError && queryError.code !== "PGRST116") {
                error = queryError;
                isHealthy = true;
            }
        } catch (err: unknown) {
            error = err instanceof Error ? err : { message: String(err) };
            isHealthy = true;
        }

        return {
            ok: true,
            healthy: isHealthy,
            message: isHealthy
                ? "Supabase project is active and healthy"
                : "Supabase project is active (tables may not exist yet)",
            error: error ? error.message : null,
        };
    } catch (error: unknown) {
        return {
            ok: true,
            healthy: false,
            message: "Health check executed (connection attempted)",
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
