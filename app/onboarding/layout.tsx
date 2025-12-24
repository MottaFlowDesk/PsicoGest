import { BrainCircuit } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering to avoid build-time Supabase client errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:px-8 justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                        <BrainCircuit size={24} />
                    </div>
                    <span className="font-bold text-xl text-slate-800 tracking-tight">PsicoGest</span>
                </Link>
                <div className="text-sm text-slate-500 hidden sm:block">
                    Configuração Inicial
                </div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                {children}
            </main>
        </div>
    );
}
