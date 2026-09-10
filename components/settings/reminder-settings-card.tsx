"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ReminderSettingsCardProps {
    professionalId: string;
    initialSettings: {
        reminder_24h: boolean;
        reminder_2h: boolean;
        reminder_channel: string;
    };
    googleConnected: boolean;
    /** Canal WhatsApp da plataforma configurado (não depende do profissional). */
    whatsappAvailable: boolean;
}

export function ReminderSettingsCard({ 
    professionalId, 
    initialSettings,
    googleConnected,
    whatsappAvailable
}: ReminderSettingsCardProps) {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(initialSettings);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/settings/reminders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                toast.success("Configurações salvas!", {
                    description: "Os lembretes serão enviados conforme configurado.",
                });
            } else {
                const msg =
                    (data as { details?: string; error?: string }).details ||
                    (data as { error?: string }).error ||
                    "Erro ao salvar";
                throw new Error(msg);
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Erro ao salvar configurações";
            toast.error("Erro ao salvar configurações", {
                description: message,
            });
        } finally {
            setLoading(false);
        }
    };

    const canSendReminders = googleConnected || whatsappAvailable;

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Lembretes Automáticos</CardTitle>
                        <CardDescription>
                            Configure quando enviar lembretes aos pacientes
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!canSendReminders && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-900">Nenhum canal disponível</p>
                            <p className="text-sm text-amber-700">
                                Conecte o Google acima para enviar por e-mail. O canal WhatsApp da plataforma está indisponível no momento.
                            </p>
                        </div>
                    </div>
                )}

                <div className={!canSendReminders ? "opacity-50 pointer-events-none" : ""}>
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-slate-900">Quando enviar?</h4>
                        
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div>
                                <Label htmlFor="reminder-24h" className="text-sm font-medium">
                                    24 horas antes
                                </Label>
                                <p className="text-xs text-slate-500">
                                    Lembrete com link de confirmação
                                </p>
                            </div>
                            <Switch
                                id="reminder-24h"
                                checked={settings.reminder_24h}
                                onCheckedChange={(checked) => 
                                    setSettings(prev => ({ ...prev, reminder_24h: checked }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <Label htmlFor="reminder-2h" className="text-sm font-medium">
                                    2 horas antes
                                </Label>
                                <p className="text-xs text-slate-500">
                                    Lembrete final da sessão
                                </p>
                            </div>
                            <Switch
                                id="reminder-2h"
                                checked={settings.reminder_2h}
                                onCheckedChange={(checked) => 
                                    setSettings(prev => ({ ...prev, reminder_2h: checked }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-medium text-slate-900">Canal de envio</h4>
                        
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="radio"
                                    name="channel"
                                    value="whatsapp_email"
                                    checked={settings.reminder_channel === "whatsapp_email"}
                                    onChange={(e) => 
                                        setSettings(prev => ({ ...prev, reminder_channel: e.target.value }))
                                    }
                                    className="w-4 h-4 text-brand-600"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        WhatsApp + Email como backup
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Envia pelo número da plataforma; sem opt-in do paciente ou em caso de falha, usa e-mail
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="radio"
                                    name="channel"
                                    value="email_only"
                                    checked={settings.reminder_channel === "email_only"}
                                    onChange={(e) => 
                                        setSettings(prev => ({ ...prev, reminder_channel: e.target.value }))
                                    }
                                    className="w-4 h-4 text-brand-600"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        Apenas Email
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Envia pelo Gmail conectado
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="radio"
                                    name="channel"
                                    value="whatsapp_only"
                                    checked={settings.reminder_channel === "whatsapp_only"}
                                    onChange={(e) => 
                                        setSettings(prev => ({ ...prev, reminder_channel: e.target.value }))
                                    }
                                    className="w-4 h-4 text-brand-600"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        Apenas WhatsApp
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Pacientes sem opt-in de WhatsApp não recebem lembrete
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            onClick={handleSave}
                            disabled={loading || !canSendReminders}
                            className="bg-brand-600 hover:bg-brand-700"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar Configurações
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

