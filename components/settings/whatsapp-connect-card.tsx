"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, QrCode, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppConnectCardProps {
    isConnected?: boolean;
    phone?: string | null;
    professionalId?: string;
}

export function WhatsAppConnectCard({ isConnected: initialConnected, phone: initialPhone, professionalId }: WhatsAppConnectCardProps = {}) {
    const [status, setStatus] = useState<'loading' | 'disconnected' | 'connecting' | 'connected'>(
        initialConnected ? 'connected' : 'loading'
    );
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [phone, setPhone] = useState<string | null>(initialPhone || null);
    const [isLoading, setIsLoading] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Se já temos status inicial, não precisa buscar novamente
        if (!initialConnected) {
            checkStatus();
        }
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [initialConnected]);

    async function checkStatus() {
        try {
            const response = await fetch('/api/whatsapp/status');
            const data = await response.json();
            
            if (data.connected) {
                setStatus('connected');
                setPhone(data.phone || null);
                setQrCode(null);
            } else {
                setStatus('disconnected');
                setPhone(null);
            }
        } catch (error) {
            console.error('Error checking status:', error);
            setStatus('disconnected');
        }
    }

    async function handleConnect() {
        setIsLoading(true);
        setStatus('connecting');

        try {
            const response = await fetch('/api/whatsapp/connect', { method: 'POST' });
            const data = await response.json();

            if (data.error) {
                toast.error(data.error);
                setStatus('disconnected');
                return;
            }

            if (data.connected) {
                setStatus('connected');
                setPhone(data.phone);
                toast.success("WhatsApp já está conectado!");
            } else if (data.qrCode) {
                setQrCode(data.qrCode);
                toast.info("Escaneie o QR Code com seu WhatsApp");
                
                // Poll for connection status
                pollIntervalRef.current = setInterval(async () => {
                    const statusResponse = await fetch('/api/whatsapp/status');
                    const statusData = await statusResponse.json();
                    
                    if (statusData.connected) {
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        setStatus('connected');
                        setPhone(statusData.phone || null);
                        setQrCode(null);
                        toast.success("WhatsApp conectado com sucesso!");
                    }
                }, 3000);

                // Stop polling after 2 minutes
                setTimeout(() => {
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        setStatus('disconnected');
                        setQrCode(null);
                        toast.error("Tempo esgotado. Tente novamente.");
                    }
                }, 120000);
            } else {
                toast.error("Erro ao gerar QR Code");
                setStatus('disconnected');
            }
        } catch (error) {
            console.error('Error connecting:', error);
            toast.error("Erro ao conectar com o servidor WhatsApp");
            setStatus('disconnected');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDisconnect() {
        setIsLoading(true);

        try {
            await fetch('/api/whatsapp/disconnect', { method: 'POST' });
            
            setStatus('disconnected');
            setPhone(null);
            setQrCode(null);
            toast.success("WhatsApp desconectado");
        } catch (error) {
            console.error('Error disconnecting:', error);
            toast.error("Erro ao desconectar");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleRefresh() {
        setIsLoading(true);
        await checkStatus();
        setIsLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">WhatsApp</CardTitle>
                            <CardDescription>Envie lembretes automáticos</CardDescription>
                        </div>
                    </div>
                    <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
                        {status === 'loading' && 'Carregando...'}
                        {status === 'disconnected' && 'Desconectado'}
                        {status === 'connecting' && 'Conectando...'}
                        {status === 'connected' && 'Conectado'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {status === 'loading' && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                )}

                {status === 'disconnected' && (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-500 mb-4">
                            Conecte seu WhatsApp para enviar lembretes automáticos aos pacientes.
                        </p>
                        <Button onClick={handleConnect} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <QrCode className="h-4 w-4 mr-2" />
                            )}
                            Conectar WhatsApp
                        </Button>
                    </div>
                )}

                {status === 'connecting' && qrCode && (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-500 mb-4">
                            Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar
                        </p>
                        <div className="flex justify-center mb-4">
                            <img 
                                src={qrCode} 
                                alt="QR Code WhatsApp" 
                                className="w-64 h-64 border rounded-lg"
                            />
                        </div>
                        <p className="text-xs text-slate-400">
                            Escaneie o QR Code acima com seu WhatsApp
                        </p>
                    </div>
                )}

                {status === 'connecting' && !qrCode && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-green-500 mb-2" />
                        <p className="text-sm text-slate-500">Gerando QR Code...</p>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-800">WhatsApp conectado</p>
                                {phone && (
                                    <p className="text-xs text-green-600">+{phone}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Atualizar
                            </Button>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleDisconnect}
                                disabled={isLoading}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Desconectar
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
