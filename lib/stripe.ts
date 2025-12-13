import Stripe from "stripe";

// Server-side Stripe client - only initialize if key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
    ? new Stripe(stripeSecretKey, {
        apiVersion: "2025-04-30.basil",
        typescript: true,
    })
    : null;

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
    return !!stripeSecretKey;
}

// Helper to format amount in cents to BRL
export function formatCentsToBRL(cents: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

// Convert BRL amount to cents
export function brlToCents(amount: number): number {
    return Math.round(amount * 100);
}

