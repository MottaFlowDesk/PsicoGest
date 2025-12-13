import { createClient } from "@/lib/supabase/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        if (!isGoogleConfigured()) {
            return NextResponse.json(
                { error: "Google OAuth não configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET." },
                { status: 503 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use user ID as state to identify the user in callback
        const authUrl = getAuthUrl(user.id);

        return NextResponse.json({ url: authUrl });
    } catch (error: any) {
        console.error("Google connect error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao gerar URL de autenticação" },
            { status: 500 }
        );
    }
}

