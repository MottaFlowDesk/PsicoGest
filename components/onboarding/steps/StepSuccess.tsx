"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Confetti from "react-confetti"; // Just kidding, let's keep it simple first
import { useWindowSize } from "react-use"; // Usually needed for confetti, but omitting for now to save dependencies

export function StepSuccess() {
    const router = useRouter();

    const handleGoToDashboard = () => {
        router.push("/dashboard");
        router.refresh();
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tudo Pronto!</h2>
            <p className="text-slate-500 mb-8">
                Seu perfil foi configurado com sucesso. Agora você já pode começar a gerenciar seus pacientes.
            </p>

            <Button onClick={handleGoToDashboard} className="w-full bg-brand-600 hover:bg-brand-700 h-12 text-lg">
                Ir para o Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
    );
}
