"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const success = searchParams.get("success");
    const [status, setStatus] = useState<"loading" | "creating" | "error">("loading");

    useEffect(() => {
        if (!sessionId || success !== "true") {
            router.push("/#pricing");
            return;
        }

        handleAccountCreation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, success]);

    async function handleAccountCreation() {
        if (!sessionId) return;

        setStatus("creating");
        
        let customerEmail: string | null = null;

        try {
            // Get checkout session details from Stripe
            const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao obter informações do pagamento");
            }

            const { customerEmail: email, subscriptionId, planId, billingPeriod } = data;
            customerEmail = email;

            if (!customerEmail || !customerEmail.includes('@')) {
                throw new Error("Email inválido no pagamento. Entre em contato com o suporte.");
            }

            // Check if user already exists
            const supabase = createClient();
            const { data: { user: existingUser } } = await supabase.auth.getUser();

            if (existingUser) {
                // User already exists, just redirect to dashboard
                router.push("/dashboard");
                return;
            }

            // Generate a secure temporary password
            const tempPassword = `Temp${Math.random().toString(36).slice(2)}${Date.now()}${Math.random().toString(36).slice(2)}!A1`;

            // Try to create account via server API (auto-confirms email, no link needed)
            const createAccountResponse = await fetch('/api/auth/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: customerEmail,
                    password: tempPassword,
                    metadata: {
                        from_checkout: "true",
                        subscription_id: subscriptionId || "",
                        plan_id: planId || "",
                        billing_period: billingPeriod || "monthly",
                    }
                }),
            });

            const accountData = await createAccountResponse.json();

            if (!createAccountResponse.ok) {
                // If server-side creation fails, user already exists or other error
                if (accountData.error?.includes("already") || accountData.error?.includes("exists")) {
                    // User already exists, try to sign in
                    const { error: signInError } = await supabase.auth.signInWithOtp({
                        email: customerEmail,
                        options: {
                            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/confirm`,
                        }
                    });

                    if (signInError) {
                        toast.info("Conta já existe. Faça login para continuar.");
                        router.push(`/login?email=${encodeURIComponent(customerEmail)}`);
                        return;
                    }

                    toast.info("Enviamos um link de acesso para seu email.");
                    router.push(`/login?email=${encodeURIComponent(customerEmail)}&check_email=true`);
                    return;
                }
                
                throw new Error(accountData.error || "Erro ao criar conta");
            }

            // Account created successfully via server API (email already confirmed)
            // Now sign in with the password
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: customerEmail,
                password: tempPassword,
            });

            if (signInError) {
                console.error("Sign-in error after account creation:", signInError);
                throw new Error("Conta criada, mas erro ao fazer login. Tente fazer login manualmente.");
            }

            if (!signInData.user || !signInData.session) {
                throw new Error("Erro ao fazer login após criar conta");
            }

            // Link subscription to professional if it exists
            if (subscriptionId) {
                try {
                    // Wait a bit for trigger to create professional
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Try to link subscription
                    const linkResponse = await fetch('/api/stripe/link-subscription', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            subscriptionId,
                            userId: signInData.user.id,
                        }),
                    });

                    if (linkResponse.ok) {
                        console.log("Subscription linked successfully");
                    }
                } catch (error) {
                    console.error("Error linking subscription:", error);
                    // Non-critical, continue anyway
                }
            }

            // Success! Redirect to onboarding (no email confirmation needed)
            toast.success("Conta criada com sucesso! Complete seu perfil.");
            router.push("/onboarding");
            router.refresh();

        } catch (error: any) {
            console.error("Error creating account:", error);
            setStatus("error");
            
            // Show more detailed error message
            let errorMessage = "Erro ao criar conta. Entre em contato com o suporte.";
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            toast.error(errorMessage);
            
            // Log full error for debugging
            console.error("Full error details:", {
                error,
                sessionId,
                customerEmail,
                errorMessage: error.message,
                errorStatus: error.status,
            });
            
            // Redirect to pricing after 3 seconds
            setTimeout(() => {
                router.push("/#pricing");
            }, 3000);
        }
    }

    if (status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Erro ao processar pagamento</h1>
                    <p className="text-slate-600 mb-4">Redirecionando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Criando sua conta...</h1>
                <p className="text-slate-600">Aguarde enquanto configuramos tudo para você.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Carregando...</h1>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
