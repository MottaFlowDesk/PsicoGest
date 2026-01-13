"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get("plan");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    // supabase client initialized in onSubmit to avoid build errors if env vars missing

    // Redirect if no plan selected
    if (!planId) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900">Escolha um Plano</h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Para criar sua conta, você precisa escolher um plano primeiro.
                    </p>
                </div>
                <Link
                    href="/#pricing"
                    className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-lg font-semibold shadow-md"
                >
                    Ver Planos e Preços
                </Link>
                <div className="text-center text-sm">
                    <span className="text-slate-500">Já tem uma conta? </span>
                    <Link href="/login" className="text-brand-600 font-semibold hover:underline">
                        Fazer Login
                    </Link>
                </div>
            </div>
        );
    }

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: SignupFormValues) {
        setIsLoading(true);
        setErrorMessage("");

        // Initialize here to prevent build crash if env vars missing
        const supabase = createClient();

        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                    }
                }
            });

            if (authError) {
                setErrorMessage(authError.message);
                return;
            }

            if (authData.user) {
                // Success! User is now logged in, redirect to checkout
                // Get billing period from URL params
                const billingPeriod = searchParams.get("billingPeriod") || "monthly";
                
                try {
                    const response = await fetch('/api/stripe/subscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            planId,
                            billingPeriod,
                        }),
                    });

                    const data = await response.json();

                    if (response.ok && data.url) {
                        // Redirect to Stripe Checkout
                        window.location.href = data.url;
                        return;
                    }
                } catch (error) {
                    console.error("Error creating checkout:", error);
                    // Fall through to login redirect
                }
                
                // If checkout creation fails, redirect to login
                await supabase.auth.signOut();
                router.push(`/login?registered=true&plan=${planId}&billingPeriod=${billingPeriod}`);
            }

        } catch (error) {
            setErrorMessage("Ocorreu um erro ao criar a conta.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Crie sua conta</h2>
                <p className="text-sm text-slate-500">
                    Complete seu cadastro para começar seu teste grátis de 14 dias
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Seu nome" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="seu@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                            {errorMessage}
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Criando conta...
                            </>
                        ) : (
                            "Criar Conta"
                        )}
                    </Button>
                </form>
            </Form>

            <div className="text-center text-sm">
                <span className="text-slate-500">Já tem uma conta? </span>
                <Link href={`/login?plan=${planId}`} className="text-brand-600 font-semibold hover:underline">
                    Fazer Login
                </Link>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Carregando...</div>}>
            <SignupForm />
        </Suspense>
    );
}
