"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface UploadDocumentButtonProps {
    patientId: string;
    professionalId: string; // Needed for storage path
}

export function UploadDocumentButton({ patientId, professionalId }: UploadDocumentButtonProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("Arquivo muito grande. Máximo 5MB.");
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload to Storage
            // Path: professionals/{prof_id}/patients/{patient_id}/{timestamp}-{filename}
            const rawExt = file.name.split('.').pop()?.toLowerCase();
            // Validate extension matches DB constraint
            const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
            if (!rawExt || !allowedExts.includes(rawExt)) {
                alert(`Tipo de arquivo não permitido: ${rawExt}. Use: ${allowedExts.join(', ')}`);
                throw new Error("Invalid file type");
            }
            const fileExt = rawExt;

            const fileName = `${Date.now()}-${file.name}`;
            const storagePath = `professionals/${professionalId}/patients/${patientId}/${fileName}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from("patient-documents")
                .upload(storagePath, file);

            if (storageError) throw storageError;

            // 2. Save metadata to Database
            const { error: dbError } = await supabase.from("patient_documents").insert({
                professional_id: professionalId,
                patient_id: patientId,
                file_name: file.name,
                file_type: fileExt,
                file_size: file.size,
                storage_path: storagePath,
                document_type: 'other', // Default type for now
                uploaded_by: professionalId // Assuming professional acts as user
            });

            if (dbError) {
                // Rollback storage if db fails (cleanup)
                await supabase.storage.from("patient-documents").remove([storagePath]);
                throw dbError;
            }

            // Success
            alert("Arquivo enviado com sucesso!");
            window.dispatchEvent(new Event("document-uploaded")); // Trigger refresh

        } catch (error) {
            console.error("Upload error:", error);
            alert("Erro ao enviar arquivo.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
            />
            <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Enviando..." : "Novo Documento"}
            </Button>
        </>
    );
}
