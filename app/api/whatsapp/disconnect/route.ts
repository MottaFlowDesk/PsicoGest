import { NextResponse } from "next/server";

/**
 * Rota legada: desconexão da instância Evolution do profissional.
 * Sem instância por profissional, não há o que desconectar.
 */
export async function POST() {
    return NextResponse.json(
        {
            error: "Desconexão descontinuada",
            message:
                "O WhatsApp do PsicoGuest usa um número único da plataforma. Para parar de enviar por WhatsApp, mude o canal de lembretes em Configurações → Integrações.",
        },
        { status: 410 }
    );
}
