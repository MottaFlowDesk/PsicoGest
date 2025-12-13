import { getAgendaSettings } from "./actions";
import { AgendaPreferencesForm } from "@/components/settings/agenda-preferences-form";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AgendaPreferencesPage() {
    const settings = await getAgendaSettings();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Preferências da Agenda</h1>
                    <p className="text-sm text-slate-500">
                        Configure os padrões para seus novos agendamentos.
                    </p>
                </div>
            </div>
            <Separator />
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <AgendaPreferencesForm initialData={settings} />
            </div>
        </div>
    );
}
