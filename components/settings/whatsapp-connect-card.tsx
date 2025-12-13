"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, CheckCircle, Smartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppConnectCardProps {
    isConnected: boolean;
    phone: string | null;
    professionalId: string;
}

export function WhatsAppConnectCard({ isConnected, phone, professionalId }: WhatsAppConnectCardProps) {
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(isConnected);
    const [connectedPhone, setConnectedPhone] = useState(phone);
    const [showQR, setShowQR] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "generating" | "waiting" | "connected" | "error">("idle");

    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/whatsapp/status");
            const data = await response.json();
            
            if (data.connected) {
                setConnected(true);
                setConnectedPhone(data.phone);
                setShowQR(false);
                setStatus("connected");
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (showQR && status === "waiting") {
            interval = setInterval(async () => {
                const isConnected = await checkStatus();
                if (isConnected) {
                    toast.success("WhatsApp conectado!", {
                        description: "Agora você pode enviar lembretes automáticos.",
                    });
                    clearInterval(interval);
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showQR, status, checkStatus]);

    const handleConnect = async () => {
        setLoading(true);
        setStatus("generating");
        setShowQR(true);

        try {
            const response = await fetch("/api/whatsapp/connect", { method: "POST" });
            const data = await response.json();

            if (data.qrCode) {
                setQrCode(data.qrCode);
                setStatus("waiting");
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error("Erro ao gerar QR Code", {
                description: error.message || "Tente novamente mais tarde.",
            });
            setShowQR(false);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshQR = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/whatsapp/connect", { method: "POST" });
            const data = await response.json();

            if (data.qrCode) {
                setQrCode(data.qrCode);
                setStatus("waiting");
            }
        } catch (error: any) {
            toast.error("Erro ao atualizar QR Code");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/whatsapp/disconnect", { method: "POST" });

            if (response.ok) {
                setConnected(false);
                setConnectedPhone(null);
                setShowQR(false);
                setQrCode(null);
                setStatus("idle");
                toast.success("WhatsApp desconectado");
            }
        } catch (error: any) {
            toast.error("Erro ao desconectar");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setShowQR(false);
        setQrCode(null);
        setStatus("idle");
    };

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                            <MessageCircle className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">WhatsApp</CardTitle>
                            <CardDescription>
                                Envie lembretes de confirmação aos pacientes
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
                {!showQR && !connected && (
                    <>
                        <ul className="text-sm text-slate-500 space-y-1.5">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Lembrete automático 24h antes da consulta
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Paciente confirma com 1 clique
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                100% gratuito
                            </li>
                        </ul>

                        <div className="pt-2">
                            <Button 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleConnect}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Smartphone className="w-4 h-4 mr-2" />
                                )}
                                Conectar WhatsApp
                            </Button>
                        </div>
                    </>
                )}

                {showQR && !connected && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-6 text-center">
                            {status === "generating" ? (
                                <div className="py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600">Gerando QR Code...</p>
                                </div>
                            ) : qrCode ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                                        <img 
                                            src={qrCode} 
                                            alt="QR Code WhatsApp" 
                                            className="w-48 h-48 mx-auto"
                                        />
                                    </div>
                                    <div className="text-left space-y-2 text-sm text-slate-600 max-w-xs mx-auto">
                                        <p className="font-medium text-slate-900">Como conectar:</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Abra o WhatsApp no celular</li>
                                            <li>Toque em <strong>Dispositivos conectados</strong></li>
                                            <li>Toque em <strong>Conectar dispositivo</strong></li>
                                            <li>Escaneie este QR Code</li>
                                        </ol>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={handleRefreshQR}
                                            disabled={loading}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                                            Atualizar QR
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={handleCancel}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8">
                                    <p className="text-red-600">Erro ao gerar QR Code</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={handleConnect}
                                    >
                                        Tentar novamente
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {connected && (
                    <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-green-900">WhatsApp Ativo</p>
                                <p className="text-sm text-green-700">
                                    {connectedPhone || "Número conectado"}
                                </p>
                            </div>
                        </div>

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
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

