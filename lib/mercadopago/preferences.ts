import { getMpClientId } from "@/lib/mercadopago/config";
import { getPublicAppUrl } from "@/lib/app/public-url";

export type InvoiceCheckoutInput = {
    id: string;
    invoiceNumber: string;
    description: string | null;
    amountCents: number;
};

type PreferenceResponse = {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
    error?: string;
};

export class MercadoPagoPreferenceError extends Error {
    constructor(
        message: string,
        readonly status: number
    ) {
        super(message);
        this.name = "MercadoPagoPreferenceError";
    }
}

export async function createInvoiceCheckoutPreference(
    accessToken: string,
    invoice: InvoiceCheckoutInput
): Promise<{ preferenceId: string; checkoutUrl: string }> {
    const appUrl = getPublicAppUrl();
    const payUrl = `${appUrl}/pay/${invoice.id}`;
    const unitPrice = Math.round(invoice.amountCents) / 100;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            items: [
                {
                    id: invoice.id,
                    title: invoice.description?.trim() || `Fatura ${invoice.invoiceNumber}`,
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: unitPrice,
                },
            ],
            external_reference: invoice.id,
            marketplace: `MP-MKT-${getMpClientId()}`,
            marketplace_fee: 0,
            statement_descriptor: "PSICOGUEST",
            notification_url: `${appUrl}/api/mercadopago/webhook`,
            back_urls: {
                success: `${payUrl}?mp=success`,
                pending: `${payUrl}?mp=pending`,
                failure: `${payUrl}?mp=failure`,
            },
            auto_return: "approved",
            payment_methods: {
                default_payment_method_id: "pix",
            },
        }),
    });

    const payload = (await response.json().catch(() => null)) as PreferenceResponse | null;

    if (!response.ok || !payload?.id || !payload.init_point) {
        throw new MercadoPagoPreferenceError(
            payload?.message || payload?.error || "Falha ao criar o checkout do Mercado Pago",
            response.status
        );
    }

    return {
        preferenceId: payload.id,
        checkoutUrl: payload.init_point,
    };
}

export async function getMercadoPagoPayment(accessToken: string, paymentId: string) {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const payload = (await response.json().catch(() => null)) as {
        id?: number | string;
        status?: string;
        external_reference?: string;
        payment_type_id?: string;
        payment_method_id?: string;
        message?: string;
    } | null;

    if (!response.ok || !payload?.id) {
        throw new MercadoPagoPreferenceError(
            payload?.message || "Falha ao consultar o pagamento no Mercado Pago",
            response.status
        );
    }

    return payload;
}
