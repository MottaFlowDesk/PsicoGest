import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerformanceReportsSection } from "@/components/dashboard/performance-reports-section";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("professionals")
        .select("full_name, registration_number")
        .eq("user_id", user.id)
        .single();

    if (!profile || !profile.registration_number) {
        redirect("/onboarding");
    }

    const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="space-y-6">
            <PerformanceReportsSection userName={profile.full_name?.split(' ')[0] || 'Doutor(a)'} currentDate={currentDate} />
        </div>
    );
}
