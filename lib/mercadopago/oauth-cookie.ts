import { NextRequest, NextResponse } from "next/server";
import { MP_OAUTH_COOKIE, MP_OAUTH_COOKIE_MAX_AGE } from "@/lib/mercadopago/config";

export type MercadoPagoOAuthCookie = {
    professionalId: string;
    nonce: string;
    codeVerifier: string;
};

function isOAuthCookie(value: unknown): value is MercadoPagoOAuthCookie {
    if (!value || typeof value !== "object") return false;
    const cookie = value as Partial<MercadoPagoOAuthCookie>;
    return (
        typeof cookie.professionalId === "string" &&
        typeof cookie.nonce === "string" &&
        typeof cookie.codeVerifier === "string"
    );
}

export function readOAuthCookie(request: NextRequest): MercadoPagoOAuthCookie | null {
    const raw = request.cookies.get(MP_OAUTH_COOKIE)?.value;
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as unknown;
        return isOAuthCookie(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function attachOAuthCookie(response: NextResponse, payload: MercadoPagoOAuthCookie) {
    response.cookies.set(MP_OAUTH_COOKIE, JSON.stringify(payload), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MP_OAUTH_COOKIE_MAX_AGE,
    });
}

export function clearOAuthCookie(response: NextResponse) {
    response.cookies.set(MP_OAUTH_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}
