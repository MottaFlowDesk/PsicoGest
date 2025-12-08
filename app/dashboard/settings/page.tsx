import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, User, CalendarClock } from "lucide-react";
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

                <Link href="/dashboard/settings/profile">
                    <Card className="hover:border-brand-500 hover:shadow-md transition-all cursor-pointer h-full">
                        <CardHeader>
                            <User className="w-8 h-8 text-brand-600 mb-2" />
                            <CardTitle>Perfil Profissional</CardTitle>
                            <CardDescription>
                                Edite seus dados, especialidades, bio e foto de perfil.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/dashboard/settings/calendar-preferences">
                    <Card className="hover:border-brand-500 hover:shadow-md transition-all cursor-pointer h-full">
                        <CardHeader>
                            <CalendarClock className="w-8 h-8 text-brand-600 mb-2" />
                            <CardTitle>Preferências de Agenda</CardTitle>
                            <CardDescription>
                                Configure duração padrão das sessões, intervalos e horários.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
