import Link from "next/link";
import { BrainCircuit, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEGAL } from "@/lib/legal/site";

interface LegalPageLayoutProps {
    title: string;
    children: React.ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-brand-600">
                        <BrainCircuit size={28} />
                        <span className="font-bold text-xl text-slate-800">
                            {LEGAL.appName}
                        </span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
                    <p className="text-slate-500 mb-8">
                        Última atualização: {LEGAL.lastUpdated}
                    </p>
                    <div className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">
                        {children}
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} {LEGAL.appName}. Todos os direitos reservados.</p>
                    <div className="flex gap-4">
                        <Link href="/terms" className="hover:text-slate-800">
                            Termos de Serviço
                        </Link>
                        <Link href="/privacy" className="hover:text-slate-800">
                            Política de Privacidade
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
