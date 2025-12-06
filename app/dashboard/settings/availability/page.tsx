import { createClient } from "@/lib/supabase/server";
import { WeeklyScheduler } from "@/components/availability/weekly-scheduler";
import { AvailabilityExceptions } from "@/components/availability/availability-exceptions";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export default async function AvailabilitySettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) redirect("/onboarding");

    // Fetch existing settings
    // Since we just created the table, likely empty first time.
    // The component will handle fetching or we can fetch here.
    // Let's fetch pure data here and pass to client components? 
    // Or let client components fetch via client? Client fetching allows simpler optimistic updates.
    // Let's stick to client fetching for the interactive scheduler for now or server + client.
    // To make it simpler and robust, I'll pass the professionalId and let the client component manage state.

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div>
                <h3 className="text-lg font-medium text-slate-900">Disponibilidade de Atendimento</h3>
                <p className="text-sm text-slate-500">Defina seus horários semanais padrão e exceções.</p>
            </div>
            <Separator />

            <div className="grid gap-8">
                <section>
                    <h4 className="text-sm font-semibold mb-4 text-slate-900 uppercase tracking-wider">Horário Semanal Padrão</h4>
                    <WeeklyScheduler professionalId={professional.id} />
                </section>

                <Separator />

                <section>
                    <h4 className="text-sm font-semibold mb-4 text-slate-900 uppercase tracking-wider">Exceções (Feriados e Bloqueios)</h4>
                    <AvailabilityExceptions professionalId={professional.id} />
                </section>
            </div>
        </div>
    );
}
