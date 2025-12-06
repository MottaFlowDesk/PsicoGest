"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText } from "lucide-react";

interface RecordFormProps {
    appointmentId: string;
    patientId: string;
    professionalId: string;
    existingRecord?: {
        id: string;
        content: string; // Assuming we'll fetch the version content simpler for MVP
        title: string;
    } | null;
    onSaved?: () => void;
}

export function RecordForm({ appointmentId, patientId, professionalId, existingRecord, onSaved }: RecordFormProps) {
    const [content, setContent] = useState(existingRecord?.content || "");
    const [title, setTitle] = useState(existingRecord?.title || "Evolução da Sessão");
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);

        try {
            // Check if record exists
            // Since our schema separates medical_records header from versions, we need to handle both.
            // Simplified logic: 
            // 1. Ensure medical_records entry exists
            // 2. Add new entry to medical_record_versions

            let recordId = existingRecord?.id;

            if (!recordId) {
                // Check if one was created already (could happen if race condition or re-render)
                const { data: existing } = await supabase
                    .from("medical_records")
                    .select("id")
                    .eq("appointment_id", appointmentId)
                    .single();

                if (existing) {
                    recordId = existing.id;
                } else {
                    // Create new Header
                    const { data: newRecord, error: headerError } = await supabase
                        .from("medical_records")
                        .insert({
                            professional_id: professionalId,
                            patient_id: patientId,
                            appointment_id: appointmentId,
                            title: title,
                            status: 'draft'
                        })
                        .select()
                        .single();

                    if (headerError) throw headerError;
                    recordId = newRecord.id;
                }
            }

            // Get current max version
            // For MVP, simplistic versioning (just mostly auto-increment or simplified insert?)
            // We just insert a new row in versions. The constraint is UNIQUE(medical_record_id, version).
            // We need to find the max version first.

            const { data: lastVersion } = await supabase
                .from("medical_record_versions")
                .select("version")
                .eq("medical_record_id", recordId)
                .order("version", { ascending: false })
                .limit(1)
                .single();

            const nextVersion = (lastVersion?.version || 0) + 1;

            const { error: versionError } = await supabase
                .from("medical_record_versions")
                .insert({
                    medical_record_id: recordId,
                    version: nextVersion,
                    content: { text: content }, // Store as JSON
                    edited_by: professionalId,
                    edit_reason: "Manual update"
                });

            if (versionError) throw versionError;

            // Update header timestamp
            await supabase.from("medical_records").update({ updated_at: new Date().toISOString() }).eq("id", recordId);

            alert("Evolução salva com sucesso!");
            onSaved?.();

        } catch (error) {
            console.error("Error saving record:", error);
            alert("Erro ao salvar evolução.");
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
