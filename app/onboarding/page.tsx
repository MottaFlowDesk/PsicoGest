import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingContent } from "./onboarding-content";

export default async function OnboardingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user has already completed onboarding
    const { data: profile } = await supabase
        .from("professionals")
        .select("id, registration_number")
        .eq("user_id", user.id)
        .single();

    // If profile exists and has registration_number, user already completed onboarding
    if (profile && profile.registration_number) {
        redirect("/dashboard");
    }

    return <OnboardingContent />;
}

