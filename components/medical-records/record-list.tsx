"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileText, ChevronRight, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MedicalRecord } from "@/app/dashboard/patients/[id]/records/actions";
import { RecordEditor } from "./record-editor";

interface RecordListProps {
    patientId: string;
    records: MedicalRecord[];
}

export function RecordList({ patientId, records }: RecordListProps) {
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

    const handleCreateNew = () => {
        setSelectedRecord(null);
        setEditorOpen(true);
    };

    const handleEdit = (record: MedicalRecord) => {
        setSelectedRecord(record);
        setEditorOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Histórico de Prontuário</h2>
                    <p className="text-sm text-slate-500">
                        {records.length} {records.length === 1 ? "registro" : "registros"} encontrados
                    </p>
                </div>
                <Button onClick={handleCreateNew} className="bg-brand-600 hover:bg-brand-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Registro
                </Button>
            </div>

            <div className="space-y-4">
                {records.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Prontuário Vazio</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                            Comece a registrar as evoluções e anotações clínicas deste paciente.
                        </p>
                        <Button onClick={handleCreateNew} variant="outline">
                            Criar Primeiro Registro
                        </Button>
                    </div>
                ) : (
                    records.map((record) => (
                        <div
                            key={record.id}
                            onClick={() => handleEdit(record)}
                            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-2 rounded-lg ${record.status === 'finalized' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {record.status === 'finalized' ? (
                                            <CheckCircle className="h-5 w-5" />
                                        ) : (
                                            <FileText className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                                                {record.title}
                                            </h3>
                                            <Badge variant={record.status === 'finalized' ? 'default' : 'secondary'} className={record.status === 'finalized' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                {record.status === 'finalized' ? 'Finalizado' : 'Rascunho v' + record.current_version}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Criado em {format(new Date(record.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                            </div>
                                            {record.updated_at !== record.created_at && (
                                                <span>• Atualizado em {format(new Date(record.updated_at), "dd/MM/yyyy HH:mm")}</span>
                                            )}
                                        </div>
                                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                                            {record.versions?.[0]?.content?.text || "Sem conteúdo..."}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <RecordEditor
                patientId={patientId}
                record={selectedRecord}
                open={editorOpen}
                onOpenChange={setEditorOpen}
                onSuccess={() => {
                    // Trigger refresh logic if needed, but Server Actions + revalidatePath should handle list update if this is server component driven.
                    // But we might need router.refresh() if using client cache.
                    // We can pass a refresh prop or router.refresh() 
                }}
            />
        </div>
    );
}
