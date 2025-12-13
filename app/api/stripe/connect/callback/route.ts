import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        if (!isStripeConfigured() || !stripe) {
            return NextResponse.redirect(
                new URL("/dashboard/financial?stripe=error&message=not_configured", request.url)
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Get professional
        const { data: professional } = await supabase
            .from("professionals")
            .select("id, stripe_account_id")
            .eq("user_id", user.id)
            .single();

        if (!professional?.stripe_account_id) {
            return NextResponse.redirect(
                new URL("/dashboard/financial?stripe=error&message=account_not_found", request.url)
            );
        }

        // Check account status
        const account = await stripe.accounts.retrieve(professional.stripe_account_id);

        if (account.charges_enabled && account.payouts_enabled) {
            // Update connected status in database
            await supabase
                .from("professionals")
                .update({
                    stripe_connected_at: new Date().toISOString(),
                })
                .eq("id", professional.id);

            return NextResponse.redirect(
                new URL("/dashboard/financial?stripe=success", request.url)
            );
        }

        // Account not fully set up
        if (!account.details_submitted) {
            return NextResponse.redirect(
                new URL("/dashboard/financial?stripe=incomplete", request.url)
            );
        }

        return NextResponse.redirect(
            new URL("/dashboard/financial?stripe=pending", request.url)
        );
    } catch (error: any) {
        console.error("Stripe callback error:", error);
        return NextResponse.redirect(
            new URL("/dashboard/financial?stripe=error", request.url)
        );
    }
}

