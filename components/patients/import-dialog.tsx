"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { patientSchema } from "@/lib/validations/patient";
import { z } from "zod";
import { useRouter } from "next/navigation";

// Define a looser schema for CSV input, then map/validate
const csvRowSchema = z.object({
    full_name: z.string().min(1, "Nome obrigatório"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().min(1, "Telefone obrigatório"),
    cpf: z.string().optional(),
    date_of_birth: z.string().min(1, "Data de nasc. obrigatória"), // Expecting YYYY-MM-DD or DD/MM/YYYY
});

type CSVRow = z.infer<typeof csvRowSchema>;

export function ImportPatientDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"upload" | "preview" | "importing" | "success">("upload");
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [importCount, setImportCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();

    const resetState = () => {
        setStep("upload");
        setParsedData([]);
        setErrors([]);
        setImportCount(0);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                validateRows(rows);
            },
            error: (error) => {
                console.error("CSV Error:", error);
                setErrors(["Erro ao ler arquivo CSV."]);
            }
        });
    };

    const validateRows = (rows: any[]) => {
        const validRows: any[] = [];
        const validationErrors: string[] = [];

        rows.forEach((row, index) => {
            // Basic normalization
            // Map common CSV headers to our keys if needed, or assume precise headers
            // Expected headers: combined with flexibility?
            // For now, assume headers match: full_name, email, phone, cpf, date_of_birth

            try {
                // Try to parse date if in DD/MM/YYYY format to YYYY-MM-DD
                let dob = row.date_of_birth;
                if (dob && dob.includes("/")) {
                    const parts = dob.split("/");
                    if (parts.length === 3) dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }

                const cleanRow = {
                    full_name: row.full_name?.trim(),
                    email: row.email?.trim() || null,
                    phone: row.phone?.replace(/\D/g, "") || "", // Simple strip
                    cpf: row.cpf?.replace(/\D/g, "") || null,
                    date_of_birth: dob,
                    // Defaults
                    address: {},
                    notes: "Importado via CSV"
                };

                // We use the patientSchema but need to separate address first as it's not flat in schema
                // Actually patientSchema expects address object.

                // Let's do a quick manual check required fields for UI feedback
                if (!cleanRow.full_name) throw new Error("Nome ausente");
                if (!cleanRow.phone) throw new Error("Telefone ausente");
                if (!cleanRow.date_of_birth) throw new Error("Data de nascimento ausente");

                validRows.push(cleanRow);
            } catch (err: any) {
                validationErrors.push(`Linha ${index + 2}: ${err.message}`);
            }
        });

        if (validRows.length === 0 && rows.length > 0) {
            validationErrors.unshift("Nenhum paciente válido encontrado. Verifique o padrão do CSV.");
        }

        setParsedData(validRows);
        setErrors(validationErrors);
        setStep("preview");
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        setStep("importing");

        try {
            // Get current professional
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: professional } = await supabase
                .from("professionals")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!professional) throw new Error("Profissional não encontrado");

            // Add professional_id to all rows
            const patientsToInsert = parsedData.map(p => ({
                ...p,
                professional_id: professional.id
            }));

            const { error } = await supabase.from("patients").insert(patientsToInsert);

            if (error) throw error;

            setImportCount(patientsToInsert.length);
            setStep("success");
            router.refresh();

        } catch (error: any) {
            console.error("Import error:", error);
            setErrors([`Erro ao salvar no banco: ${error.message}`]);
            setStep("preview"); // Go back to show error
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setTimeout(resetState, 300); // Reset after close animation
        }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Importar Pacientes</DialogTitle>
                    <DialogDescription>
                        Adicione múltiplos pacientes de uma vez. O arquivo deve ser CSV.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === "upload" && (
                        <div
                            className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-sm font-medium text-slate-900">Clique para selecionar arquivo CSV</p>
                            <p className="text-xs text-slate-500 mt-1">Colunas: full_name, date_of_birth (YYYY-MM-DD), phone, email, cpf</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileUpload}
                            />
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span>{parsedData.length} pacientes prontos para importar.</span>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-md p-3 max-h-[150px] overflow-y-auto">
                                    <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Erros encontrados ({errors.length})
                                    </div>
                                    <ul className="list-disc pl-5 text-xs text-red-600 space-y-1">
                                        {errors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                    <p className="text-xs text-red-500 mt-2 font-medium">Linhas com erro serão ignoradas (apenas nesta versão simplificada).</p>
                                </div>
                            )}

                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-3 py-2">Nome</th>
                                            <th className="px-3 py-2">Email</th>
                                            <th className="px-3 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2">{row.full_name}</td>
                                                <td className="px-3 py-2">{row.email || "-"}</td>
                                                <td className="px-3 py-2 text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Ok</td>
                                            </tr>
                                        ))}
                                        {parsedData.length > 5 && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-2 text-center text-slate-500 italic">
                                                    ...e mais {parsedData.length - 5}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
                            <p className="text-slate-600">Salvando pacientes...</p>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Importação Concluída!</h3>
                            <p className="text-slate-600 mt-1">{importCount} pacientes foram adicionados com sucesso.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === "upload" && (
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    )}
                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={resetState}>Voltar</Button>
                            <Button onClick={handleImport} disabled={parsedData.length === 0}>
                                Importar {parsedData.length} Pacientes
                            </Button>
                        </>
                    )}
                    {step === "success" && (
                        <Button onClick={() => setOpen(false)}>Fechar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
