import { NextResponse } from "next/server";

/**
 * Webhook legado da Evolution API (uma instância por profissional).
 *
 * Descontinuado: a confirmação agora acontece exclusivamente pelo link
 * assinado em /confirm/[token]. Aceitar "SIM" por texto livre permitia
 * confirmar a sessão de outra pessoa a partir de um número parecido, então a
 * rota foi fechada em vez de mantida.
 *
 * O webhook ativo é /api/whatsapp/platform/webhook (Meta Cloud API), que só
 * registra status de entrega.
 */
const DEPRECATION = {
    error: "Endpoint descontinuado",
    message:
        "A integração por instância (Evolution API) foi substituída pelo WhatsApp da plataforma. Use /api/whatsapp/platform/webhook.",
} as const;

export async function POST() {
    console.warn("[WhatsApp Webhook] Chamada recebida em rota legada da Evolution API");
    return NextResponse.json(DEPRECATION, { status: 410 });
}

export async function GET() {
    return NextResponse.json(DEPRECATION, { status: 410 });
}
