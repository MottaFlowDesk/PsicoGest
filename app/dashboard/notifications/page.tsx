import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
        <p className="text-slate-500 mt-1">
          Gerencie suas notificações e mantenha-se atualizado sobre eventos importantes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Notificações</CardTitle>
          <CardDescription>
            Visualize e gerencie todas as suas notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationList />
        </CardContent>
      </Card>
    </div>
  );
}

