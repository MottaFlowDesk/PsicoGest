import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, User } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    return (
        <div className="space-y-6 pt-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
                <p className="text-slate-500">Gerencie as preferências da sua conta e consultório.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/settings/availability">
                    <Card className="hover:border-brand-500 hover:shadow-md transition-all cursor-pointer h-full">
                        <CardHeader>
                            <Clock className="w-8 h-8 text-brand-600 mb-2" />
                            <CardTitle>Disponibilidade</CardTitle>
                            <CardDescription>
                                Configure seus horários de atendimento semanal e exceções (feriados).
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* Placeholders for future settings */}
                <Card className="opacity-50 cursor-not-allowed h-full">
                    <CardHeader>
                        <User className="w-8 h-8 text-slate-400 mb-2" />
                        <CardTitle>Perfil Profissional</CardTitle>
                        <CardDescription>
                            Em breve: Edite seus dados, especialidades e foto.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="opacity-50 cursor-not-allowed h-full">
                    <CardHeader>
                        <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                        <CardTitle>Preferências de Agenda</CardTitle>
                        <CardDescription>
                            Em breve: Duração padrão de consulta, tipos de serviço.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
