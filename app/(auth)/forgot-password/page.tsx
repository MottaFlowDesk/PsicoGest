"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSent(true);
        } catch (err: any) {
            setError(err.message || "Erro ao enviar email de recuperação");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-purple-50 p-4">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Email Enviado!</CardTitle>
                        <CardDescription>
                            Verifique sua caixa de entrada
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-center text-slate-600">
                            Enviamos um link de recuperação para <strong>{email}</strong>. 
                            Clique no link para redefinir sua senha.
                        </p>
                        <p className="text-center text-sm text-slate-500">
                            Não recebeu? Verifique sua pasta de spam ou aguarde alguns minutos.
                        </p>
                        <div className="pt-4">
                            <Link href="/login">
                                <Button variant="outline" className="w-full">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar para Login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-purple-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-brand-600" />
                    </div>
                    <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
                    <CardDescription>
                        Digite seu email para receber um link de recuperação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full bg-brand-600 hover:bg-brand-700"
                            disabled={loading || !email}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                "Enviar Link de Recuperação"
                            )}
                        </Button>

                        <div className="text-center pt-2">
                            <Link 
                                href="/login" 
                                className="text-sm text-brand-600 hover:text-brand-700"
                            >
                                <ArrowLeft className="w-4 h-4 inline mr-1" />
                                Voltar para Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

