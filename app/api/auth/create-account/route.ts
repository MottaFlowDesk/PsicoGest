import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Criar conta e confirmar automaticamente (server-side)
 * POST /api/auth/create-account
 * Body: { email: string, password: string, metadata?: object }
 * 
 * Usa service role para criar e confirmar usuário sem precisar de email confirmation
 */
export async function POST(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: "Supabase não configurado" },
                { status: 503 }
            );
        }

        const { email, password, metadata } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e senha são obrigatórios" },
                { status: 400 }
            );
        }

        // Create Supabase admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
            return NextResponse.json(
                { error: "Usuário já existe com este email" },
                { status: 409 }
            );
        }

        // Create user using admin API (bypasses email confirmation)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email (no link needed!)
            user_metadata: metadata || {},
        });

        if (createError) {
            console.error("Error creating user:", createError);
            return NextResponse.json(
                { error: createError.message || "Erro ao criar conta" },
                { status: 500 }
            );
        }

        if (!userData.user) {
            return NextResponse.json(
                { error: "Erro ao criar conta" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            user: {
                id: userData.user.id,
                email: userData.user.email,
                email_confirmed_at: userData.user.email_confirmed_at,
            },
        });
    } catch (error: any) {
        console.error("Create account error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar conta" },
            { status: 500 }
        );
    }
}

