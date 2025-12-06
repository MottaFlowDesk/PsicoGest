"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileIcon, FileText, Image as ImageIcon, Trash2, Download, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from("patient-documents")
            .createSignedUrl(doc.storage_path, 60); // 1 minute expiry

        if (error || !data) {
            alert("Erro ao gerar link de download");
            return;
        }

        window.open(data.signedUrl, "_blank");
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
        } catch (error) {
            console.error("Delete error:", error);
            alert("Erro ao excluir arquivo.");
        } finally {
            setDeletingId(null);
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
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Tamanho</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell>{getFileIcon(doc.file_type)}</TableCell>
                            <TableCell className="font-medium truncate max-w-[200px]" title={doc.file_name}>
                                {doc.file_name}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                                {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-500">
                                {formatSize(doc.file_size)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Baixar/Visualizar">
                                        <Eye className="h-4 w-4 text-slate-600" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" title="Excluir">
                                                <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-600" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
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
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
