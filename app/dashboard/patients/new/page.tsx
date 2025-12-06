import { PatientForm } from "@/components/patients/patient-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/patients">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Novo Paciente</h1>
                    <p className="text-slate-500">Preencha os dados abaixo para cadastrar</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <PatientForm />
            </div>
        </div>
    );
}
