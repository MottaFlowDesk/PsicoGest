import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleConnectCard } from "@/components/settings/google-connect-card";
import { WhatsAppConnectCard } from "@/components/settings/whatsapp-connect-card";
import { ReminderSettingsCard } from "@/components/settings/reminder-settings-card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function IntegrationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: professional } = await supabase
        .from("professionals")
        .select("id, google_calendar_connected, google_refresh_token, whatsapp_connected_at, whatsapp_phone")
        .eq("user_id", user.id)
        .single();

    if (!professional) redirect("/onboarding");

    const { data: settings } = await supabase
        .from("settings")
        .select("reminder_24h, reminder_2h, reminder_channel")
        .eq("professional_id", professional.id)
        .single();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Integrações</h1>
                    <p className="text-sm text-slate-500">
                        Conecte suas contas para automatizar lembretes e agenda.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Google Integration */}
                <GoogleConnectCard 
                    isConnected={professional.google_calendar_connected || false}
                    professionalId={professional.id}
                />

                {/* WhatsApp Integration */}
                <WhatsAppConnectCard 
                    isConnected={!!professional.whatsapp_connected_at}
                    phone={professional.whatsapp_phone}
                    professionalId={professional.id}
                />

                {/* Reminder Settings */}
                <ReminderSettingsCard 
                    professionalId={professional.id}
                    initialSettings={{
                        reminder_24h: settings?.reminder_24h ?? true,
                        reminder_2h: settings?.reminder_2h ?? false,
                        reminder_channel: settings?.reminder_channel ?? 'whatsapp_email',
                    }}
                    googleConnected={professional.google_calendar_connected || false}
                    whatsappConnected={!!professional.whatsapp_connected_at}
                />
            </div>
        </div>
    );
}

