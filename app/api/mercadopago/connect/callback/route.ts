import { NextRequest, NextResponse } from "next/server";
import { getPublicAppUrl } from "@/lib/app/public-url";
import { getCurrentProfessionalId } from "@/lib/mercadopago/current-professional";
import { saveMercadoPagoConnection } from "@/lib/mercadopago/connection";
import { isMercadoPagoOAuthConfigured } from "@/lib/mercadopago/config";
import { clearOAuthCookie, readOAuthCookie } from "@/lib/mercadopago/oauth-cookie";
import { exchangeAuthorizationCode, MercadoPagoOAuthError } from "@/lib/mercadopago/oauth";

function redirectToFinancial(query: string) {
    const response = NextResponse.redirect(`${getPublicAppUrl()}/dashboard/financial?${query}`);
    clearOAuthCookie(response);
    return response;
}

export async function GET(request: NextRequest) {
    try {
        if (!isMercadoPagoOAuthConfigured()) {
            return redirectToFinancial("mp=error&reason=not_configured");
        }

        const denied = request.nextUrl.searchParams.get("error");
        if (denied) {
            const reason = denied === "access_denied" ? "denied" : "oauth_error";
            return redirectToFinancial(`mp=${reason}`);
        }

        const code = request.nextUrl.searchParams.get("code");
        const state = request.nextUrl.searchParams.get("state");
        const cookie = readOAuthCookie(request);

        if (!code || !state || !cookie || cookie.nonce !== state) {
            return redirectToFinancial("mp=error&reason=invalid_state");
        }

        const identity = await getCurrentProfessionalId();
        if ("error" in identity) {
            return NextResponse.redirect(`${getPublicAppUrl()}/login`);
        }

        if (identity.professionalId !== cookie.professionalId) {
            return redirectToFinancial("mp=error&reason=session_mismatch");
        }

        const token = await exchangeAuthorizationCode({
            code,
            codeVerifier: cookie.codeVerifier,
        });

        await saveMercadoPagoConnection(identity.professionalId, token);
        return redirectToFinancial("mp=success");
    } catch (error) {
        if (error instanceof MercadoPagoOAuthError) {
            console.error("Mercado Pago token exchange failed:", error.code, error.message);
        } else {
            console.error("Mercado Pago callback error:", error);
        }
        return redirectToFinancial("mp=error&reason=token_exchange");
    }
}
