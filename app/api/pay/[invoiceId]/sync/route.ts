import { NextRequest, NextResponse } from "next/server";
import { applyApprovedMercadoPagoPayment } from "@/lib/mercadopago/settle-invoice";

type RouteContext = {
    params: Promise<{ invoiceId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { invoiceId } = await context.params;
        const body = (await request.json().catch(() => null)) as { paymentId?: string } | null;
        const paymentId =
            body?.paymentId ||
            request.nextUrl.searchParams.get("payment_id") ||
            request.nextUrl.searchParams.get("collection_id");

        if (!paymentId) {
            return NextResponse.json({ error: "Pagamento não informado" }, { status: 400 });
        }

        const result = await applyApprovedMercadoPagoPayment({
            invoiceId,
            paymentId,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Mercado Pago payment sync error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Não foi possível confirmar o pagamento" },
            { status: 500 }
        );
    }
}
