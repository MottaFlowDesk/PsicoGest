import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, CalendarClock, ChevronRight, Plug } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const settingsItems = [
        {
            title: "Meu Perfil",
            description: "Edite seus dados pessoais, foto, especialidades e bio.",
            href: "/dashboard/settings/profile",
            icon: User,
            color: "bg-blue-50 text-blue-600",
        },
        {
            title: "Integrações",
            description: "Conecte Google Calendar, WhatsApp e configure lembretes.",
            href: "/dashboard/settings/integrations",
            icon: Plug,
            color: "bg-orange-50 text-orange-600",
        },
        {
            title: "Disponibilidade",
            description: "Configure seus horários de atendimento semanal e exceções.",
            href: "/dashboard/settings/availability",
            icon: Clock,
            color: "bg-green-50 text-green-600",
        },
        {
            title: "Preferências de Agenda",
            description: "Duração padrão das sessões, intervalos e notificações.",
            href: "/dashboard/settings/calendar-preferences",
            icon: CalendarClock,
            color: "bg-purple-50 text-purple-600",
        },
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
                <p className="text-sm text-slate-500">
                    Gerencie suas preferências e informações do consultório.
                </p>
            </div>

            <div className="grid gap-4">
                {settingsItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <Card className="hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center gap-4 p-5">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                                        {item.title}
                                    </CardTitle>
                                    <CardDescription className="text-sm mt-0.5">
                                        {item.description}
                                    </CardDescription>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
