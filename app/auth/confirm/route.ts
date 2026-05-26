import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Callback do Supabase após confirmação de e-mail ou magic link.
 * Configure em: Authentication → URL Configuration → Redirect URLs
 * Ex.: http://localhost:3000/auth/confirm
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirm`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/confirm]", error.message);
    return NextResponse.redirect(`${origin}/login?error=confirm`);
  }

  const safeNext = next.startsWith("/") ? next : "/onboarding";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
