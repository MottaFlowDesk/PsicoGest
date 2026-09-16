import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { runOutbox } from "@/lib/cron/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest) {
    if (!isCronAuthorized(request)) {
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
        const result = await runOutbox({ batchSize });

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
