import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

    if (!profile) {
        redirect("/onboarding");
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar
                userName={profile.full_name}
                userAvatar={profile.avatar_url}
            />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
