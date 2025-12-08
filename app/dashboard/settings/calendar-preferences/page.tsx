import { getAgendaSettings } from "./actions";
import { AgendaPreferencesForm } from "@/components/settings/agenda-preferences-form";
import { Separator } from "@/components/ui/separator";

export default async function AgendaPreferencesPage() {
    const settings = await getAgendaSettings();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Preferências da Agenda</h3>
                <p className="text-sm text-muted-foreground">
                    Configure os padrões para seus novos agendamentos.
                </p>
            </div>
            <Separator />
            <AgendaPreferencesForm initialData={settings} />
        </div>
    );
}
