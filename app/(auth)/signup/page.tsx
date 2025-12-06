"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const supabase = createClient();

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
                // Success! Sign out immediately to force manual login, then redirect
                await supabase.auth.signOut();
                router.push("/login?registered=true");
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
                <h2 className="text-lg font-semibold text-slate-900">Crie sua conta grátis</h2>
                <p className="text-sm text-slate-500">
                    Comece a transformar sua gestão clínica hoje
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
