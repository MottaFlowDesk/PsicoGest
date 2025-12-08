import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
