"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Stethoscope, Camera, FileCheck, FileQuestion } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UploadDocumentButtonProps {
    patientId: string;
    professionalId: string; // Needed for storage path
}

const documentCategories = [
    { value: "exam", label: "Exame", icon: Stethoscope, color: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
    { value: "photo", label: "Foto", icon: Camera, color: "bg-purple-50 border-purple-200 hover:bg-purple-100" },
    { value: "consent", label: "Consentimento", icon: FileCheck, color: "bg-green-50 border-green-200 hover:bg-green-100" },
    { value: "other", label: "Outro", icon: FileQuestion, color: "bg-slate-50 border-slate-200 hover:bg-slate-100" },
];

export function UploadDocumentButton({ patientId, professionalId }: UploadDocumentButtonProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("other");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("Arquivo muito grande. Máximo 5MB.");
            return;
        }

        const rawExt = file.name.split('.').pop()?.toLowerCase();
        const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
        if (!rawExt || !allowedExts.includes(rawExt)) {
            toast.error(`Tipo de arquivo não permitido: ${rawExt}. Use: ${allowedExts.join(', ')}`);
            return;
        }

        setSelectedFile(file);
        // Auto-suggest category based on file type
        if (['jpg', 'jpeg', 'png'].includes(rawExt)) {
            setSelectedCategory("photo");
        } else if (rawExt === 'pdf') {
            setSelectedCategory("exam");
        } else {
            setSelectedCategory("other");
        }
        setShowCategoryDialog(true);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            const rawExt = selectedFile.name.split('.').pop()?.toLowerCase();
            const fileExt = rawExt!;

            const fileName = `${Date.now()}-${selectedFile.name}`;
            const storagePath = `professionals/${professionalId}/patients/${patientId}/${fileName}`;

            const { error: storageError } = await supabase.storage
                .from("patient-documents")
                .upload(storagePath, selectedFile);

            if (storageError) throw storageError;

            // Save metadata to Database
            const { error: dbError } = await supabase.from("patient_documents").insert({
                professional_id: professionalId,
                patient_id: patientId,
                file_name: selectedFile.name,
                file_type: fileExt,
                file_size: selectedFile.size,
                storage_path: storagePath,
                document_type: selectedCategory,
                uploaded_by: professionalId
            });

            if (dbError) {
                // Rollback storage if db fails
                await supabase.storage.from("patient-documents").remove([storagePath]);
                throw dbError;
            }

            toast.success("Arquivo enviado com sucesso!");
            window.dispatchEvent(new Event("document-uploaded"));
            setShowCategoryDialog(false);
            setSelectedFile(null);

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro ao enviar arquivo.");
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
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
            />
            <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-brand-600 hover:bg-brand-700"
            >
                <Upload className="mr-2 h-4 w-4" />
                Novo Documento
            </Button>

            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Categorizar Documento</DialogTitle>
                        <DialogDescription>
                            Selecione a categoria para <strong>{selectedFile?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 py-4">
                        <Label>Categoria</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {documentCategories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.value)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                            selectedCategory === cat.value 
                                                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' 
                                                : cat.color
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${selectedCategory === cat.value ? 'text-brand-600' : 'text-slate-600'}`} />
                                        <span className={`font-medium ${selectedCategory === cat.value ? 'text-brand-700' : 'text-slate-700'}`}>
                                            {cat.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleUpload} 
                            disabled={isUploading}
                            className="bg-brand-600 hover:bg-brand-700"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Enviar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
