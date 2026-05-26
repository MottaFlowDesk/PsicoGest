"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

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
import { getAuthErrorMessage } from "@/lib/auth/messages";
import { toast } from "sonner";
import { Mail } from "lucide-react";

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
    const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    // supabase client initialized in onSubmit to avoid build errors if env vars missing

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
            const redirectTo = `${window.location.origin}/auth/confirm?next=/onboarding`;

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email.trim(),
                password: data.password,
                options: {
                    emailRedirectTo: redirectTo,
                    data: {
                        full_name: data.fullName,
                    },
                },
            });

            if (authError) {
                setErrorMessage(getAuthErrorMessage(authError));
                return;
            }

            if (!authData.user) {
                setErrorMessage("Não foi possível criar a conta. Tente novamente.");
                return;
            }

            if (planId) {
                localStorage.setItem(
                    "pendingSubscription",
                    JSON.stringify({ planId, billingPeriod: "monthly" })
                );
            }

            // Sessão ativa = e-mail já confirmado ou confirmação desligada no Supabase
            if (authData.session) {
                toast.success("Conta criada! Complete seu perfil para começar.");
                router.push("/onboarding");
                router.refresh();
                return;
            }

            // Sem sessão: Supabase exige confirmação de e-mail antes do login
            setRegisteredEmail(data.email.trim());
            setAwaitingEmailConfirmation(true);
            toast.info("Enviamos um link de confirmação para seu e-mail.");

        } catch (error) {
            setErrorMessage("Ocorreu um erro ao criar a conta.");
        } finally {
            setIsLoading(false);
        }
    }

    if (awaitingEmailConfirmation) {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-brand-50 flex items-center justify-center">
                        <Mail className="h-7 w-7 text-brand-600" />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Confirme seu e-mail</h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Enviamos um link para <strong className="text-slate-700">{registeredEmail}</strong>.
                        Clique no link e depois faça login com a <strong>mesma senha</strong> que você cadastrou.
                    </p>
                </div>
                <p className="text-xs text-slate-400">
                    Não recebeu? Verifique a pasta de spam ou cadastre-se de novo com outro e-mail.
                </p>
                <Link
                    href="/login"
                    className="inline-block w-full text-center bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-lg font-semibold"
                >
                    Já confirmei — ir para o login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Crie sua conta</h2>
                <p className="text-sm text-slate-500">
                    {planId
                        ? "Cadastro gratuito — você pode assinar um plano depois nas configurações"
                        : "Comece no plano gratuito (até 5 pacientes). Assine quando quiser."}
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
                <Link href="/login" className="text-brand-600 font-semibold hover:underline">
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
