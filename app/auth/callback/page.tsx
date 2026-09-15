"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/signup");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Redirecionando...</h1>
            </div>
        </div>
    );
}
