"use client";

import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Check, User, MapPin, Stethoscope, CheckCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const steps = [
    { id: 1, label: "Dados", icon: User },
    { id: 2, label: "Endereço", icon: MapPin },
    { id: 3, label: "Clínica", icon: Stethoscope },
    { id: 4, label: "Pronto", icon: CheckCircle },
];

export function OnboardingHeader() {
    const { currentStep } = useOnboardingStore();
    const supabase = createClient();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="w-full max-w-3xl mx-auto mb-8 flex flex-col items-center">
            <div className="w-full flex justify-end mb-4 px-4 sm:px-0">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600 gap-2">
                    <LogOut size={16} />
                    Sair
                </Button>
            </div>
            <div className="relative flex justify-between w-full">
                {/* Connecting Lines */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-brand-600 -translate-y-1/2 z-0 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white transition-all duration-300",
                                    isActive
                                        ? "border-brand-600 text-brand-600 scale-110"
                                        : "border-slate-300 text-slate-400",
                                    isCompleted && "bg-brand-600 border-brand-600 text-white"
                                )}
                            >
                                {isCompleted ? (
                                    <Check size={20} className="stroke-[3]" />
                                ) : (
                                    <step.icon size={20} />
                                )}
                            </div>
                            <span className={cn(
                                "text-xs font-medium bg-slate-50 px-2 rounded-md transition-colors",
                                isActive ? "text-brand-700" : "text-slate-500"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
