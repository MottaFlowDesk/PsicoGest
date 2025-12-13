import { createClient } from "@/lib/supabase/server";
import { WeeklyScheduler } from "@/components/availability/weekly-scheduler";
import { AvailabilityExceptions } from "@/components/availability/availability-exceptions";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Disponibilidade</h1>
                    <p className="text-sm text-slate-500">Defina seus horários semanais padrão e exceções.</p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
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
