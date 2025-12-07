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

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const supabase = createClient();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(data: LoginFormValues) {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                console.error("Login error:", error);

                if (error.message.includes("Invalid login credentials")) {
                    setErrorMessage("Email ou senha inválidos.");
                } else {
                    setErrorMessage("Erro ao fazer login. Verifique suas credenciais.");
                }
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (error) {
            setErrorMessage("Ocorreu um erro inesperado.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Bem-vindo de volta</h2>
                <p className="text-sm text-slate-500">
                    Acesse sua conta para gerenciar seus pacientes
                </p>
            </div>

            {registered && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-600 text-center">
                    Conta criada com sucesso! Faça login para continuar.
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                            {errorMessage}
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            "Entrar"
                        )}
                    </Button>
                </form>
            </Form>

            <div className="text-center text-sm">
                <span className="text-slate-500">Não tem uma conta? </span>
                <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
                    Criar conta grátis
                </Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Carregando...</div>}>
            <LoginForm />
        </Suspense>
    );
}
