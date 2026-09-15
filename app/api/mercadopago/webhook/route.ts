import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago/preferences";
import { applyApprovedMercadoPagoPayment } from "@/lib/mercadopago/settle-invoice";

async function readPaymentId(request: NextRequest): Promise<string | null> {
    const queryId =
        request.nextUrl.searchParams.get("data.id") || request.nextUrl.searchParams.get("id");
    const topic =
        request.nextUrl.searchParams.get("type") || request.nextUrl.searchParams.get("topic");

    const body = (await request.clone().json().catch(() => null)) as
        | { action?: string; type?: string; data?: { id?: string | number } }
        | null;

    if (body?.data?.id) {
        return String(body.data.id);
    }

    if (queryId && (topic === "payment" || !topic)) {
        return queryId;
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const paymentId = await readPaymentId(request);
        if (!paymentId) {
            return NextResponse.json({ received: true });
        }

        const platformToken = process.env.MP_ACCESS_TOKEN?.trim();
        if (!platformToken) {
            console.error("Mercado Pago webhook sem MP_ACCESS_TOKEN");
            return NextResponse.json({ received: true });
        }

        const payment = await getMercadoPagoPayment(platformToken, paymentId);
        if (!payment.external_reference || payment.status !== "approved") {
            return NextResponse.json({ received: true, status: payment.status });
        }

        await applyApprovedMercadoPagoPayment({
            invoiceId: payment.external_reference,
            paymentId,
            accessToken: platformToken,
        });

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Mercado Pago webhook error:", error);
        return NextResponse.json({ received: true });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
