import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleConnectCard } from "@/components/settings/google-connect-card";
import { WhatsAppConnectCard } from "@/components/settings/whatsapp-connect-card";
import { ReminderSettingsCard } from "@/components/settings/reminder-settings-card";
import { ArrowLeft, AlertCircle, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface IntegrationsPageProps {
    searchParams: Promise<{ error?: string; google?: string }>;
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
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

    const params = await searchParams;
    const error = params?.error;
    const googleConnected = params?.google === "connected";

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

            {/* Success Message */}
            {googleConnected && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Google conectado com sucesso!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Sua conta Google foi conectada. Agora você pode sincronizar sua agenda e enviar emails.
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Messages */}
            {error && (
                <Alert className={error === "access_denied_test_user" ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200"}>
                    <AlertCircle className={`h-4 w-4 ${error === "access_denied_test_user" ? "text-orange-600" : "text-red-600"}`} />
                    <AlertTitle className={error === "access_denied_test_user" ? "text-orange-900" : "text-red-900"}>
                        {error === "access_denied_test_user"
                            ? "App em Modo de Teste"
                            : error === "gmail_scope_missing"
                              ? "Permissão de e-mail não concedida"
                              : "Erro ao Conectar"}
                    </AlertTitle>
                    <AlertDescription className={error === "access_denied_test_user" ? "text-orange-700" : "text-red-700"}>
                        {error === "gmail_scope_missing" ? (
                            <div className="space-y-2">
                                <p>
                                    A conexão não incluiu permissão para enviar e-mails. Use{" "}
                                    <strong>Reconectar</strong> e marque a opção de enviar e-mails pelo Gmail.
                                </p>
                                <p className="text-sm">
                                    No{" "}
                                    <a
                                        href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline font-medium"
                                    >
                                        Google Cloud Console
                                    </a>
                                    , verifique se a <strong>Gmail API</strong> está ativada para este projeto.
                                </p>
                            </div>
                        ) : error === "access_denied_test_user" ? (
                            <div className="space-y-2">
                                <p>O app Google OAuth está em modo de teste e seu email precisa ser adicionado como testador.</p>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                    <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a></li>
                                    <li>Vá em <strong>OAuth consent screen</strong></li>
                                    <li>Na seção <strong>Test users</strong>, clique em <strong>+ ADD USERS</strong></li>
                                    <li>Adicione seu email: <strong>{user.email}</strong></li>
                                    <li>Tente conectar novamente</li>
                                </ol>
                                <div className="mt-3">
                                    <Link href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="mt-2">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Abrir Google Cloud Console
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <p>Ocorreu um erro ao conectar. Tente novamente ou verifique as configurações.</p>
                        )}
                    </AlertDescription>
                </Alert>
            )}

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

