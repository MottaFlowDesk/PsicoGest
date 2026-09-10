"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Send, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface PlatformStatus {
    available: boolean;
    reason: string | null;
    templates: Record<string, boolean>;
    last30Days: { queued: number; sent: number; failed: number };
}

export function WhatsAppPlatformCard() {
    const [status, setStatus] = useState<PlatformStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [testPhone, setTestPhone] = useState("");
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => {
        let active = true;

        fetch("/api/whatsapp/status")
            .then((res) => res.json())
            .then((data) => {
                if (active && !data.error) setStatus(data);
            })
            .catch(() => {
                if (active) setStatus(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    async function handleTest() {
        setSendingTest(true);
        try {
            const response = await fetch("/api/whatsapp/test-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: testPhone }),
            });
            const data = await response.json();

            if (response.ok) {
                toast.success("Mensagem de teste enviada", {
                    description: `Template ${data.template} enviado para ${testPhone}.`,
                });
            } else {
                toast.error("Falha no envio de teste", {
                    description: data.error || data.suggestion,
                });
            }
        } catch {
            toast.error("Não foi possível contatar o servidor");
        } finally {
            setSendingTest(false);
        }
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
                            <CardDescription>
                                Confirmações e lembretes pelo número oficial do PsicoGuest
                            </CardDescription>
                        </div>
                    </div>
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                        <Badge variant={status?.available ? "default" : "secondary"}>
                            {status?.available ? "Ativo" : "Indisponível"}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <p className="text-sm text-slate-600">
                        Você não precisa conectar seu aparelho nem escanear QR Code. As
                        mensagens saem do número verificado da plataforma, em seu nome, e o
                        paciente confirma por um link seguro.
                    </p>
                </div>

                {!loading && !status?.available && status?.reason && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                            <p className="text-sm font-medium text-amber-900">
                                Canal WhatsApp fora do ar
                            </p>
                            <p className="text-sm text-amber-700">{status.reason}</p>
                        </div>
                    </div>
                )}

                {status?.available && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <Metric label="Entregues" value={status.last30Days.sent} />
                            <Metric label="Na fila" value={status.last30Days.queued} />
                            <Metric label="Falharam" value={status.last30Days.failed} />
                        </div>
                        <p className="text-xs text-slate-400">Últimos 30 dias</p>

                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            <Label htmlFor="test-phone" className="text-sm font-medium">
                                Enviar teste
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="test-phone"
                                    type="tel"
                                    inputMode="tel"
                                    placeholder="11999998888"
                                    value={testPhone}
                                    onChange={(event) => setTestPhone(event.target.value)}
                                />
                                <Button
                                    onClick={handleTest}
                                    disabled={sendingTest || testPhone.length < 10}
                                    variant="outline"
                                >
                                    {sendingTest ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Usa o próximo agendamento da sua agenda como exemplo.
                            </p>
                        </div>
                    </>
                )}

                <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                    O paciente só recebe no WhatsApp se tiver autorizado o contato no
                    cadastro. Sem autorização, a mensagem vai por e-mail.
                </p>
            </CardContent>
        </Card>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
        </div>
    );
}
