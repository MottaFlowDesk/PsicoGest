"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileIcon, FileText, Image as ImageIcon, Trash2, Download, Eye, Loader2, X, ExternalLink, Stethoscope, Camera, FileCheck, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface DocumentListProps {
    patientId: string;
}

interface Document {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
    storage_path: string;
    document_type: string;
}

export function DocumentList({ patientId }: DocumentListProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const supabase = createClient();

    const fetchDocuments = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("patient_documents")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setDocuments(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchDocuments();

        // Listen for upload events to refresh list
        const handleRefresh = () => fetchDocuments();
        window.addEventListener("document-uploaded", handleRefresh);

        return () => {
            window.removeEventListener("document-uploaded", handleRefresh);
        };
    }, [patientId]);

    const isImage = (type: string) => {
        return type.includes("image") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => type.includes(ext));
    };

    const handlePreview = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from("patient-documents")
            .createSignedUrl(doc.storage_path, 300); // 5 minutes expiry

        if (error || !data) {
            toast.error("Erro ao carregar preview");
            return;
        }

        if (isImage(doc.file_type)) {
            setPreviewDoc(doc);
            setPreviewUrl(data.signedUrl);
        } else {
            // For non-images, open in new tab
            window.open(data.signedUrl, "_blank");
        }
    };

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from("patient-documents")
            .createSignedUrl(doc.storage_path, 60); // 1 minute expiry

        if (error || !data) {
            toast.error("Erro ao gerar link de download");
            return;
        }

        // Create a temporary link to trigger download
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = doc.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado");
    };

    const handleDelete = async (doc: Document) => {
        setDeletingId(doc.id);
        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from("patient-documents")
                .remove([doc.storage_path]);

            if (storageError) throw storageError;

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from("patient_documents")
                .delete()
                .eq("id", doc.id);

            if (dbError) throw dbError;

            // Update local state
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
            toast.success("Documento excluído");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Erro ao excluir arquivo");
        } finally {
            setDeletingId(null);
        }
    };

    const getDocumentTypeInfo = (type: string) => {
        switch (type) {
            case "exam":
                return { label: "Exame", icon: Stethoscope, color: "bg-blue-100 text-blue-700" };
            case "photo":
                return { label: "Foto", icon: Camera, color: "bg-purple-100 text-purple-700" };
            case "consent":
                return { label: "Consentimento", icon: FileCheck, color: "bg-green-100 text-green-700" };
            default:
                return { label: "Outro", icon: FileQuestion, color: "bg-slate-100 text-slate-700" };
        }
    };

    const getFileIcon = (type: string) => {
        if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
        if (['jpg', 'jpeg', 'png'].includes(type) || type.includes("image")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
        return <FileIcon className="h-4 w-4 text-slate-500" />;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    if (isLoading) {
        return <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
                <FileIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum documento encontrado.</p>
            </div>
        );
    }

    return (
        <>
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Tamanho</TableHead>
                            <TableHead className="w-[140px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => {
                            const typeInfo = getDocumentTypeInfo(doc.document_type);
                            const TypeIcon = typeInfo.icon;
                            
                            return (
                                <TableRow key={doc.id} className="hover:bg-slate-50">
                                    <TableCell>
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                            {getFileIcon(doc.file_type)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900 truncate max-w-[200px]" title={doc.file_name}>
                                            {doc.file_name}
                                        </div>
                                        {isImage(doc.file_type) && (
                                            <span className="text-xs text-brand-600 cursor-pointer hover:underline" onClick={() => handlePreview(doc)}>
                                                Clique para visualizar
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`${typeInfo.color} font-normal`}>
                                            <TypeIcon className="w-3 h-3 mr-1" />
                                            {typeInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                        <div className="text-xs text-slate-400">
                                            {format(new Date(doc.created_at), "HH:mm", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-slate-500">
                                        {formatSize(doc.file_size)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handlePreview(doc)} 
                                                title="Visualizar"
                                                className="hover:bg-blue-50"
                                            >
                                                <Eye className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDownload(doc)} 
                                                title="Baixar"
                                                className="hover:bg-green-50"
                                            >
                                                <Download className="h-4 w-4 text-green-600" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Excluir" className="hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            <strong>{doc.file_name}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(doc)}
                                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                        >
                                                            {deletingId === doc.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : "Excluir"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Image Preview Modal */}
            <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) { setPreviewUrl(null); setPreviewDoc(null); } }}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center justify-between">
                            <span className="truncate">{previewDoc?.file_name}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => previewDoc && handleDownload(previewDoc)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => previewUrl && window.open(previewUrl, "_blank")}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Abrir
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative bg-slate-900 min-h-[400px] max-h-[70vh] flex items-center justify-center">
                        {previewUrl && (
                            <img 
                                src={previewUrl} 
                                alt={previewDoc?.file_name || "Preview"} 
                                className="max-w-full max-h-[70vh] object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
