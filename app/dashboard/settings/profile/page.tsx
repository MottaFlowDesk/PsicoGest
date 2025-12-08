import { getProfile } from "./actions";
import { ProfileForm } from "@/components/settings/profile-form";
import { Separator } from "@/components/ui/separator";

export default async function ProfilePage() {
    const profile = await getProfile();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Perfil Profissional</h3>
                <p className="text-sm text-muted-foreground">
                    Gerencie como você aparece para seus pacientes e seus dados de contato.
                </p>
            </div>
            <Separator />
            <ProfileForm initialData={profile} />
        </div>
    );
}
