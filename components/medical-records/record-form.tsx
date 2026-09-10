"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText } from "lucide-react";
import { saveAppointmentEvolution } from "@/app/dashboard/patients/[id]/records/actions";
import { toast } from "sonner";

interface RecordFormProps {
    appointmentId: string;
    patientId: string;
    existingRecord?: {
        id: string;
        content: string;
        title: string;
    } | null;
    onSaved?: () => void;
}

export function RecordForm({ appointmentId, patientId, existingRecord, onSaved }: RecordFormProps) {
    const [content, setContent] = useState(existingRecord?.content || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);

        try {
            await saveAppointmentEvolution({
                appointmentId,
                patientId,
                title: existingRecord?.title,
                content,
                recordId: existingRecord?.id,
            });
            toast.success("Evolução salva com sucesso!");
            onSaved?.();
        } catch (error) {
            console.error("Error saving record:", error);
            toast.error("Erro ao salvar evolução.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium">
                <FileText className="h-4 w-4" />
                <h3>Registro de Evolução</h3>
            </div>

            <Textarea
                placeholder="Descreva a evolução do paciente nesta sessão..."
                className="min-h-[150px] bg-white"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Evolução
                </Button>
            </div>
        </div>
    );
}
