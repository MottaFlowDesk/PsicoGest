import { processOutbox } from "@/lib/messaging/outbox";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Worker HTTP da fila de mensagens.
 *
 * Chamado por Vercel Cron (header x-vercel-cron) ou por um agendador externo
 * com `Authorization: Bearer $CRON_SECRET`. Deve rodar a cada minuto para que
 * o retry com backoff funcione como esperado.
 */
function isAuthorized(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return true;

    if (request.headers.get("x-vercel-cron")) return true;
    return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function handle(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            {
                error: "Unauthorized",
                message:
                    "Envie 'Authorization: Bearer SEU_CRON_SECRET' para processar a fila.",
            },
            { status: 401 }
        );
    }

    const batchSize = Number(request.nextUrl.searchParams.get("batch")) || undefined;

    try {
        const result = await processOutbox({ batchSize });

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao processar fila";
        console.error("[Outbox worker]", error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return handle(request);
}

export async function POST(request: NextRequest) {
    return handle(request);
}
