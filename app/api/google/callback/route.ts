import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode, getUserEmail, isGoogleConfigured } from "@/lib/google/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        if (!isGoogleConfigured()) {
            return NextResponse.redirect(
                new URL("/dashboard/settings/integrations?error=google_not_configured", request.url)
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state"); // User ID
        const error = searchParams.get("error");

        if (error) {
            console.error("Google OAuth error:", error);
            
            // Provide more helpful error messages
            let errorMessage = error;
            if (error === "access_denied") {
                errorMessage = "access_denied_test_user";
            }
            
            return NextResponse.redirect(
                new URL(`/dashboard/settings/integrations?error=${errorMessage}`, request.url)
            );
        }

        if (!code) {
            return NextResponse.redirect(
                new URL("/dashboard/settings/integrations?error=no_code", request.url)
            );
        }

        // Get tokens from Google
        const tokens = await getTokensFromCode(code);

        if (!tokens.refresh_token) {
            return NextResponse.redirect(
                new URL("/dashboard/settings/integrations?error=no_refresh_token", request.url)
            );
        }

        // Verify user is authenticated
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(
                new URL("/login", request.url)
            );
        }

        // Verify state matches (optional security check)
        if (state && state !== user.id) {
            return NextResponse.redirect(
                new URL("/dashboard/settings/integrations?error=state_mismatch", request.url)
            );
        }

        // Get user's Google email
        const googleEmail = await getUserEmail(tokens.refresh_token);

        // Update professional with Google credentials
        const { error: updateError } = await supabase
            .from("professionals")
            .update({
                google_calendar_connected: true,
                google_refresh_token: tokens.refresh_token,
            })
            .eq("user_id", user.id);

        if (updateError) {
            console.error("Error updating professional:", updateError);
            return NextResponse.redirect(
                new URL("/dashboard/settings/integrations?error=update_failed", request.url)
            );
        }

        // Success - redirect back to integrations page
        return NextResponse.redirect(
            new URL("/dashboard/settings/integrations?google=connected", request.url)
        );
    } catch (error: any) {
        console.error("Google callback error:", error);
        return NextResponse.redirect(
            new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(error.message)}`, request.url)
        );
    }
}

