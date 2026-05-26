"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Video, Mail, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface GoogleConnectCardProps {
    isConnected: boolean;
    professionalId: string;
}

export function GoogleConnectCard({ isConnected, professionalId }: GoogleConnectCardProps) {
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(isConnected);

    const startGoogleOAuth = async () => {
        const response = await fetch("/api/google/connect");
        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
            return;
        }
        throw new Error(data.error || "Erro ao conectar");
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            await startGoogleOAuth();
        } catch (error: any) {
            let errorMessage = error.message || "Tente novamente mais tarde.";

            if (errorMessage.includes("access_denied") || errorMessage.includes("403")) {
                errorMessage =
                    "O app está em modo de teste. Adicione seu email como testador no Google Cloud Console.";
            }

            toast.error("Erro ao conectar com Google", {
                description: errorMessage,
                duration: 6000,
            });
            setLoading(false);
        }
    };

    const handleReconnect = async () => {
        setLoading(true);
        try {
            await fetch("/api/google/disconnect", { method: "POST" });
            setConnected(false);
            await startGoogleOAuth();
        } catch (error: any) {
            toast.error("Erro ao reconectar com Google", {
                description: error.message || "Tente novamente mais tarde.",
                duration: 6000,
            });
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/google/disconnect", { method: "POST" });
            
            if (response.ok) {
                setConnected(false);
                toast.success("Google desconectado", {
                    description: "A integração foi removida.",
                });
            } else {
                throw new Error("Erro ao desconectar");
            }
        } catch (error: any) {
            toast.error("Erro ao desconectar", {
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                            <svg className="w-7 h-7" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        </div>
                        <div>
                            <CardTitle className="text-lg">Google</CardTitle>
                            <CardDescription>
                                Calendário, Meet e Email em um só lugar
                            </CardDescription>
                        </div>
                    </div>
                    {connected && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Conectado
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Agenda</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        <Video className="w-4 h-4 text-green-600" />
                        <span>Meet</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        <Mail className="w-4 h-4 text-red-500" />
                        <span>Email</span>
                    </div>
                </div>

                <ul className="text-sm text-slate-500 space-y-1.5">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Sincronizar agenda com Google Calendar
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Criar links de Meet automaticamente
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Enviar emails pelo seu Gmail
                    </li>
                </ul>

                {connected && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Se os e-mails falharem: ative a{" "}
                        <a
                            href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                        >
                            Gmail API
                        </a>{" "}
                        no Google Cloud e use <strong>Reconectar</strong> abaixo.
                    </p>
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                    {connected ? (
                        <>
                        <Button
                            variant="outline"
                            onClick={handleReconnect}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <ExternalLink className="w-4 h-4 mr-2" />
                            )}
                            Reconectar
                        </Button>
                        <Button 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleDisconnect}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Desconectar
                        </Button>
                        </>
                    ) : (
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleConnect}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <ExternalLink className="w-4 h-4 mr-2" />
                            )}
                            Conectar com Google
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

