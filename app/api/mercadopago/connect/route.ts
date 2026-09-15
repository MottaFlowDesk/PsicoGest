import { NextResponse } from "next/server";
import { getCurrentProfessionalId } from "@/lib/mercadopago/current-professional";
import {
    deleteMercadoPagoConnection,
    getMercadoPagoConnectionStatus,
} from "@/lib/mercadopago/connection";
import { isMercadoPagoOAuthConfigured } from "@/lib/mercadopago/config";
import { attachOAuthCookie } from "@/lib/mercadopago/oauth-cookie";
import { buildAuthorizationUrl } from "@/lib/mercadopago/oauth";
import { generateCodeChallenge, generateCodeVerifier, generateOAuthState } from "@/lib/mercadopago/pkce";

export async function GET() {
    try {
        if (!isMercadoPagoOAuthConfigured()) {
            return NextResponse.json({
                configured: false,
                connected: false,
            });
        }

        const identity = await getCurrentProfessionalId();
        if ("error" in identity) {
            const status = identity.error === "unauthorized" ? 401 : 404;
            return NextResponse.json(
                { configured: true, connected: false, error: identity.error },
                { status }
            );
        }

        const status = await getMercadoPagoConnectionStatus(identity.professionalId);
        return NextResponse.json({
            configured: true,
            ...status,
        });
    } catch (error) {
        console.error("Mercado Pago status error:", error);
        return NextResponse.json(
            { configured: true, connected: false, error: "status_failed" },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        if (!isMercadoPagoOAuthConfigured()) {
            return NextResponse.json(
                { error: "Mercado Pago não configurado. Defina MP_CLIENT_ID e MP_CLIENT_SECRET." },
                { status: 503 }
            );
        }

        const identity = await getCurrentProfessionalId();
        if ("error" in identity) {
            const status = identity.error === "unauthorized" ? 401 : 404;
            const message =
                identity.error === "unauthorized"
                    ? "Faça login para conectar o Mercado Pago"
                    : "Perfil profissional não encontrado";
            return NextResponse.json({ error: message }, { status });
        }

        const nonce = generateOAuthState();
        const codeVerifier = generateCodeVerifier();
        const url = buildAuthorizationUrl({
            state: nonce,
            codeChallenge: generateCodeChallenge(codeVerifier),
        });

        const response = NextResponse.json({ url });
        attachOAuthCookie(response, {
            professionalId: identity.professionalId,
            nonce,
            codeVerifier,
        });
        return response;
    } catch (error) {
        console.error("Mercado Pago connect error:", error);
        return NextResponse.json(
            { error: "Não foi possível iniciar a conexão com o Mercado Pago" },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const identity = await getCurrentProfessionalId();
        if ("error" in identity) {
            const status = identity.error === "unauthorized" ? 401 : 404;
            return NextResponse.json({ error: identity.error }, { status });
        }

        await deleteMercadoPagoConnection(identity.professionalId);
        return NextResponse.json({ connected: false });
    } catch (error) {
        console.error("Mercado Pago disconnect error:", error);
        return NextResponse.json(
            { error: "Não foi possível desconectar o Mercado Pago" },
            { status: 500 }
        );
    }
}
