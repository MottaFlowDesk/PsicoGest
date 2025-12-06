import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("professionals")
        .select("*")
        .eq("user_id", user.id)
        .single();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-slate-900">Meu Perfil</h3>
                <p className="text-sm text-slate-500">
                    Gerencie suas informações pessoais e profissionais.
                </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <ProfileForm initialData={profile} />
            </div>
        </div>
    );
}
