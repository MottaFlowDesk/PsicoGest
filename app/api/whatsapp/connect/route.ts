import { NextResponse } from "next/server";

/**
 * Rota legada: conexão por QR code (Evolution API / Baileys).
 *
 * O WhatsApp agora é centralizado na WABA da plataforma, então o profissional
 * não conecta o próprio número. Ver /api/whatsapp/status.
 */
export async function POST() {
    return NextResponse.json(
        {
            error: "Conexão por QR code descontinuada",
            message:
                "O WhatsApp do PsicoGuest agora usa um número único da plataforma. Não é necessário conectar seu aparelho.",
        },
        { status: 410 }
    );
}
