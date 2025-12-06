import { BrainCircuit } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-brand-600 p-2 rounded-xl text-white mb-4 shadow-lg shadow-brand-500/20">
                        <BrainCircuit size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">PsicoGest</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestão inteligente para sua clínica</p>
                </div>

                {children}
            </div>

            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-100/40 blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-3xl"></div>
            </div>
        </div>
    );
}
