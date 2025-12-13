"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, PatientValues } from "@/lib/validations/patient";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { updatePatient } from "@/app/dashboard/patients/[id]/actions";

interface PatientFormProps {
    mode?: "create" | "edit";
    initialData?: {
        id: string;
        full_name: string;
        date_of_birth: string;
        phone: string;
        email?: string | null;
        cpf?: string | null;
        occupation?: string | null;
        notes?: string | null;
        address?: {
            zip?: string;
            street?: string;
            number?: string;
            complement?: string;
            neighborhood?: string;
            city?: string;
            state?: string;
        } | null;
    };
    onSuccess?: () => void;
}

export function PatientForm({ mode = "create", initialData, onSuccess }: PatientFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const form = useForm<PatientValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            fullName: initialData?.full_name || "",
            cpf: initialData?.cpf || "",
            dateOfBirth: initialData?.date_of_birth || "",
            phone: initialData?.phone || "",
            email: initialData?.email || "",
            occupation: initialData?.occupation || "",
            notes: initialData?.notes || "",
            address: {
                cep: initialData?.address?.zip || "",
                street: initialData?.address?.street || "",
                number: initialData?.address?.number || "",
                complement: initialData?.address?.complement || "",
                neighborhood: initialData?.address?.neighborhood || "",
                city: initialData?.address?.city || "",
                state: initialData?.address?.state || "",
            },
        },
    });

    async function onSubmit(data: PatientValues) {
        setIsSubmitting(true);
        try {
            if (mode === "edit" && initialData?.id) {
                // Update existing patient
                await updatePatient({
                    patientId: initialData.id,
                    fullName: data.fullName,
                    dateOfBirth: data.dateOfBirth,
                    phone: data.phone,
                    email: data.email,
                    cpf: data.cpf,
                    occupation: data.occupation,
                    notes: data.notes,
                    address: data.address,
                });

                toast.success("Paciente atualizado com sucesso!");
                onSuccess?.();
                router.refresh();
            } else {
                // Create new patient
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not authenticated");

                const { data: professional } = await supabase
                    .from('professionals')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (!professional) throw new Error("Professional profile not found");

                const { error } = await supabase.from('patients').insert({
                    professional_id: professional.id,
                    full_name: data.fullName,
                    cpf: data.cpf || null,
                    date_of_birth: data.dateOfBirth,
                    phone: data.phone,
                    email: data.email || null,
                    occupation: data.occupation,
                    notes: data.notes,
                    address: {
                        zip: data.address.cep,
                        street: data.address.street,
                        number: data.address.number,
                        complement: data.address.complement,
                        neighborhood: data.address.neighborhood,
                        city: data.address.city,
                        state: data.address.state
                    }
                });

                if (error) throw error;

                toast.success("Paciente cadastrado com sucesso!");
                router.push("/dashboard/patients");
                router.refresh();
            }
        } catch (error) {
            console.error("Error saving patient:", error);
            toast.error(mode === "edit" ? "Erro ao atualizar paciente" : "Erro ao cadastrar paciente");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Dados Pessoais */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem className="col-span-full">
                                    <FormLabel>Nome Completo *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do paciente" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Nascimento *</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="cpf"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CPF</FormLabel>
                                    <FormControl>
                                        <Input placeholder="000.000.000-00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="occupation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profissão</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Professor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* Contato */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone/WhatsApp *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(00) 00000-0000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="paciente@email.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                {/* Endereço */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="address.cep"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CEP *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="00000-000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="hidden md:block md:col-span-2"></div>

                        <FormField
                            control={form.control}
                            name="address.street"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Rua *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Rua..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.neighborhood"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bairro *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Bairro" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cidade *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Cidade" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>UF *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="UF" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address.complement"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Complemento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Apto, Sala..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="grid grid-cols-1">
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas Iniciais / Queixa Principal</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observações iniciais sobre o paciente..." className="h-32 resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" type="button" onClick={() => mode === "edit" ? onSuccess?.() : router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {mode === "edit" ? "Salvando..." : "Cadastrando..."}
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {mode === "edit" ? "Salvar Alterações" : "Cadastrar Paciente"}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
