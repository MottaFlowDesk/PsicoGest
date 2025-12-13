import { getProfile } from "./actions";
import { ProfileForm } from "@/components/settings/profile-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
    const profile = await getProfile();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
                    <p className="text-sm text-slate-500">
                        Gerencie suas informações pessoais e profissionais.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <ProfileForm initialData={profile} />
            </div>
        </div>
    );
}
