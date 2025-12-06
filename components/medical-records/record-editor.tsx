"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { createMedicalRecord, updateMedicalRecord, MedicalRecord } from "@/app/dashboard/patients/[id]/records/actions";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
    content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
    editReason: z.string().optional(),
});

interface RecordEditorProps {
    patientId: string;
    record?: MedicalRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function RecordEditor({
    patientId,
    record,
    open,
    onOpenChange,
    onSuccess,
}: RecordEditorProps) {
    const [isLoading, setIsLoading] = useState(false);
    // We need to define useToast. I'll check if it exists or if I need to fallback.
    // Assuming standard shadcn implementation used in project.
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: record?.title || "",
            content: record?.versions?.[0]?.content?.text || "",
            editReason: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>, isFinalizing: boolean = false) {
        setIsLoading(true);
        try {
            if (record) {
                // Update existing record
                await updateMedicalRecord({
                    recordId: record.id,
                    patientId,
                    content: values.content,
                    status: isFinalizing ? "finalized" : "draft",
                    editReason: values.editReason,
                });
                toast({
                    title: isFinalizing ? "Prontuário finalizado" : "Prontuário atualizado",
                    description: "As alterações foram salvas com sucesso.",
                });
            } else {
                // Create new record
                await createMedicalRecord({
                    patientId,
                    title: values.title,
                    content: values.content,
                });
                toast({
                    title: "Prontuário criado",
                    description: "O novo registro foi criado com sucesso.",
                });
            }
            onSuccess?.();
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao salvar o prontuário. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const isEditing = !!record;
    const isFinalized = record?.status === "finalized";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Prontuário" : "Novo Prontuário"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Edite as informações abaixo. Uma nova versão será criada ao salvar."
                            : "Preencha os dados para criar um novo registro no prontuário do paciente."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Sessão de Terapia #01" {...field} disabled={isFinalized || (isEditing && true)} />
                                        {/* Title often immutable in some systems, but schema doesn't strictly forbid it. 
                        However, updateMedicalRecord action I wrote only updates content and status/meta, NOT title. 
                        So I should disable title editing or update the action. 
                        Let's verify logic: updateMedicalRecord implementation only takes content. 
                        So title is indeed immutable in my current action implementation. Keeping it disabled if editing. */}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conteúdo / Evolução</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva os detalhes do atendimento..."
                                            className="min-h-[300px] resize-none"
                                            {...field}
                                            disabled={isFinalized}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isEditing && !isFinalized && (
                            <FormField
                                control={form.control}
                                name="editReason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo da Edição (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Correção de digitação" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            {!isFinalized && (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={form.handleSubmit((v) => onSubmit(v, false))}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar Rascunho
                                    </Button>
                                    <Button
                                        type="button"
                                        className="bg-brand-600 hover:bg-brand-700"
                                        onClick={form.handleSubmit((v) => onSubmit(v, true))}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Finalizar
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
