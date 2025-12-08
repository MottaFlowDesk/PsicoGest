import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { NewInvoiceDialog } from "@/components/financial/new-invoice-dialog";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user has completed onboarding
    const { data: profile } = await supabase
        .from("professionals")
        .select("registration_number")
        .eq("user_id", user.id)
        .single();

    // If no CRP (registration_number), assume onboarding is incomplete
    if (!profile || !profile.registration_number) {
        redirect("/onboarding");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">Bem-vindo ao sistema PsicoGest.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Ações Rápidas</h3>
                    <div className="flex flex-wrap gap-4">
                        <NewAppointmentDialog />
                        <NewInvoiceDialog />
                    </div>
                </div>

                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Status do Sistema</h3>
                    <p className="text-sm text-slate-500">
                        Seu perfil está completo e você está pronto para atender.
                    </p>
                </div>
            </div>
        </div>
    );
}
