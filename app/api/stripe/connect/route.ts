import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json(
                { error: "Stripe não configurado. Configure STRIPE_SECRET_KEY no arquivo .env.local" },
                { status: 503 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get professional
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, email, full_name, stripe_account_id")
            .eq("user_id", user.id)
            .single();

        if (!professional) {
            return NextResponse.json({ error: "Professional not found" }, { status: 404 });
        }

        // Check if already has a Stripe account
        if (professional.stripe_account_id) {
            // Create account link for existing account (to complete onboarding or update)
            const accountLink = await stripe.accountLinks.create({
                account: professional.stripe_account_id,
                refresh_url: `${request.nextUrl.origin}/dashboard/financial?stripe=refresh`,
                return_url: `${request.nextUrl.origin}/api/stripe/connect/callback`,
                type: "account_onboarding",
            });

            return NextResponse.json({ url: accountLink.url });
        }

        // Create new Stripe Connect Express account
        const account = await stripe.accounts.create({
            type: "express",
            country: "BR",
            email: professional.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
            business_profile: {
                mcc: "8049", // Health practitioners office
                product_description: "Serviços de psicologia e saúde mental",
            },
            metadata: {
                professional_id: professional.id,
            },
        });

        // Save account ID to database
        const { error: updateError } = await supabase
            .from("professionals")
            .update({
                stripe_account_id: account.id,
            })
            .eq("id", professional.id);

        if (updateError) {
            // Cleanup: delete the Stripe account if we couldn't save it
            await stripe.accounts.del(account.id);
            throw new Error("Failed to save Stripe account");
        }

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${request.nextUrl.origin}/dashboard/financial?stripe=refresh`,
            return_url: `${request.nextUrl.origin}/api/stripe/connect/callback`,
            type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: any) {
        console.error("Stripe Connect error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create Stripe account" },
            { status: 500 }
        );
    }
}

// Get connection status
export async function GET(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.json({ 
                connected: false, 
                error: "Stripe não configurado" 
            });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ connected: false, error: "Unauthorized" }, { status: 401 });
        }

        const { data: professional } = await supabase
            .from("professionals")
            .select("stripe_account_id, stripe_connected_at")
            .eq("user_id", user.id)
            .single();

        if (!professional?.stripe_account_id) {
            return NextResponse.json({ connected: false });
        }

        // Get account details from Stripe
        const account = await stripe.accounts.retrieve(professional.stripe_account_id);

        return NextResponse.json({
            connected: account.charges_enabled && account.payouts_enabled,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            accountId: account.id,
        });
    } catch (error: any) {
        console.error("Stripe status error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get status" },
            { status: 500 }
        );
    }
}

