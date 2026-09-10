"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, PatientValues } from "@/lib/validations/patient";
import {
    getPatientDbErrorMessage,
    normalizeCpfForDb,
    normalizePhoneForDb,
} from "@/lib/patients/format-for-db";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Save, Upload, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { createPatient, updatePatient } from "@/app/dashboard/patients/[id]/actions";
import { formatCpf } from "@/lib/brazil/cpf";
import { formatCep, lookupCep } from "@/lib/brazil/cep";

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
        avatar_url?: string | null;
        whatsapp_opt_in_at?: string | null;
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
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [cropOpen, setCropOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const cropImageUrlRef = useRef<string | null>(null);
    const lastLookedUpCep = useRef<string>("");
    const supabase = createClient();
    const router = useRouter();

    const revokeCropImageUrl = () => {
        if (cropImageUrlRef.current) {
            URL.revokeObjectURL(cropImageUrlRef.current);
            cropImageUrlRef.current = null;
        }
        setImageToCrop(null);
    };

    useEffect(() => {
        return () => revokeCropImageUrl();
    }, []);

    const form = useForm<PatientValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            fullName: initialData?.full_name || "",
            cpf: formatCpf(initialData?.cpf || ""),
            dateOfBirth: initialData?.date_of_birth || "",
            phone: initialData?.phone || "",
            email: initialData?.email || "",
            whatsappOptIn: !!initialData?.whatsapp_opt_in_at,
            occupation: initialData?.occupation || "",
            notes: initialData?.notes || "",
            avatarUrl: initialData?.avatar_url || "",
            address: {
                cep: formatCep(initialData?.address?.zip || ""),
                street: initialData?.address?.street || "",
                number: initialData?.address?.number || "",
                complement: initialData?.address?.complement || "",
                neighborhood: initialData?.address?.neighborhood || "",
                city: initialData?.address?.city || "",
                state: initialData?.address?.state || "",
            },
        },
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Formato inválido", {
                description: "Selecione uma imagem (JPG, PNG, etc.).",
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Arquivo muito grande", {
                description: "O tamanho máximo é 5MB.",
            });
            return;
        }

        revokeCropImageUrl();
        const objectUrl = URL.createObjectURL(file);
        cropImageUrlRef.current = objectUrl;
        setImageToCrop(objectUrl);
        setCropOpen(true);
    };

    const openCropForExisting = () => {
        if (!avatarUrl) return;
        revokeCropImageUrl();
        setImageToCrop(avatarUrl);
        setCropOpen(true);
    };

    const uploadCroppedAvatar = async (blob: Blob) => {
        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const prefix = initialData?.id || `new-${user.id}`;
            const fileName = `patients/${prefix}-${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, blob, {
                    upsert: true,
                    contentType: "image/jpeg",
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            form.setValue("avatarUrl", publicUrl);
            toast.success("Foto aplicada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload", {
                description: "Não foi possível enviar a imagem.",
            });
            throw error;
        } finally {
            setIsUploading(false);
            revokeCropImageUrl();
        }
    };

    const handleCropOpenChange = (open: boolean) => {
        setCropOpen(open);
        if (!open) revokeCropImageUrl();
    };

    const avatarUrl = form.watch("avatarUrl");
    const fullName = form.watch("fullName");

    const applyCepLookup = async (rawCep: string) => {
        const digits = rawCep.replace(/\D/g, "");
        if (digits.length !== 8 || lastLookedUpCep.current === digits) return;

        lastLookedUpCep.current = digits;
        setIsLoadingCep(true);
        try {
            const address = await lookupCep(digits);
            form.setValue("address.street", address.street, { shouldValidate: true });
            form.setValue("address.neighborhood", address.neighborhood, { shouldValidate: true });
            form.setValue("address.city", address.city, { shouldValidate: true });
            form.setValue("address.state", address.state, { shouldValidate: true });
            if (address.complement && !form.getValues("address.complement")) {
                form.setValue("address.complement", address.complement);
            }
            form.setFocus("address.number");
        } catch {
            lastLookedUpCep.current = "";
        } finally {
            setIsLoadingCep(false);
        }
    };

    async function onSubmit(data: PatientValues) {
        setIsSubmitting(true);
        try {
            if (mode === "edit" && initialData?.id) {
                // Update existing patient
                await updatePatient({
                    patientId: initialData.id,
                    fullName: data.fullName,
                    dateOfBirth: data.dateOfBirth,
                    phone: normalizePhoneForDb(data.phone),
                    email: data.email,
                    whatsappOptIn: data.whatsappOptIn,
                    cpf: normalizeCpfForDb(data.cpf) ?? undefined,
                    occupation: data.occupation,
                    notes: data.notes,
                    avatarUrl: data.avatarUrl,
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

                // Check subscription limits
                try {
                    const limitsResponse = await fetch(`/api/subscription/limits?professionalId=${professional.id}`);
                    if (limitsResponse.ok) {
                        const { patient: patientLimits } = await limitsResponse.json();
                        if (patientLimits && !patientLimits.canAdd) {
                            toast.error(
                                `Limite de pacientes atingido (${patientLimits.currentCount}/${patientLimits.maxAllowed}). ` +
                                `Faça upgrade do seu plano para adicionar mais pacientes.`,
                                {
                                    action: {
                                        label: "Ver Planos",
                                        onClick: () => router.push("/dashboard/settings/subscription"),
                                    },
                                }
                            );
                            setIsSubmitting(false);
                            return;
                        }
                    }
                } catch (error) {
                    console.error("Error checking subscription limits:", error);
                    // Continue anyway - don't block patient creation if check fails
                }

                const phone = normalizePhoneForDb(data.phone);
                const cpf = normalizeCpfForDb(data.cpf);

                const newPatient = await createPatient({
                    fullName: data.fullName,
                    dateOfBirth: data.dateOfBirth,
                    phone,
                    cpf,
                    email: data.email || undefined,
                    occupation: data.occupation || null,
                    notes: data.notes || null,
                    avatarUrl: data.avatarUrl || null,
                    whatsappOptIn: data.whatsappOptIn,
                    address: {
                        zip: data.address.cep,
                        street: data.address.street,
                        number: data.address.number,
                        complement: data.address.complement,
                        neighborhood: data.address.neighborhood,
                        city: data.address.city,
                        state: data.address.state,
                    },
                });

                if (newPatient) {
                    try {
                        const { notifyPatientCreated } = await import("@/lib/notifications/patient-notifications");
                        await notifyPatientCreated(professional.id, {
                            patientName: data.fullName,
                            patientId: newPatient.id,
                        });
                    } catch (notificationError) {
                        console.error("Failed to create patient notification:", notificationError);
                        // Don't fail the patient creation if notification fails
                    }
                }

                toast.success("Paciente cadastrado com sucesso!");
                router.push("/dashboard/patients");
                router.refresh();
            }
        } catch (error) {
            console.error("Error saving patient:", error);
            const message = getPatientDbErrorMessage(error);
            toast.error(
                mode === "edit" ? message || "Erro ao atualizar paciente" : message || "Erro ao cadastrar paciente"
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Foto do Paciente */}
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <Avatar className="h-24 w-24 ring-4 ring-white shadow-lg">
                        <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-brand-100 text-brand-700 font-bold">
                            {fullName?.substring(0, 2).toUpperCase() || <User className="h-10 w-10" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-900">Foto do Paciente</h3>
                        <p className="text-sm text-slate-500">
                            Arraste e ajuste o zoom para posicionar a foto dentro do avatar.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="patient-avatar-upload"
                                onChange={handleFileSelect}
                                disabled={isUploading || isSubmitting || cropOpen}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading || isSubmitting || cropOpen}
                                onClick={() => document.getElementById("patient-avatar-upload")?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {isUploading ? "Enviando..." : avatarUrl ? "Alterar foto" : "Carregar foto"}
                            </Button>
                            {avatarUrl && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={isUploading || isSubmitting || cropOpen}
                                        onClick={openCropForExisting}
                                    >
                                        Ajustar enquadramento
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isUploading || isSubmitting}
                                        onClick={() => form.setValue("avatarUrl", "")}
                                    >
                                        Remover
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <AvatarCropDialog
                    open={cropOpen}
                    onOpenChange={handleCropOpenChange}
                    imageSrc={imageToCrop}
                    onConfirm={uploadCroppedAvatar}
                />

                <Separator />

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
                                        <Input
                                            placeholder="000.000.000-00"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={14}
                                            {...field}
                                            onChange={(event) => field.onChange(formatCpf(event.target.value))}
                                        />
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

                    <FormField
                        control={form.control}
                        name="whatsappOptIn"
                        render={({ field }) => (
                            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                <div className="space-y-1">
                                    <FormLabel className="text-sm font-medium">
                                        Autoriza contato por WhatsApp
                                    </FormLabel>
                                    <p className="text-xs text-slate-500">
                                        Necessário para enviar confirmações e lembretes pelo
                                        número oficial do PsicoGuest. Sem autorização, o
                                        paciente recebe apenas por e-mail.
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
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
                                        <div className="relative">
                                            <Input
                                                placeholder="00000-000"
                                                inputMode="numeric"
                                                autoComplete="postal-code"
                                                maxLength={9}
                                                {...field}
                                                onChange={(event) => {
                                                    const formatted = formatCep(event.target.value);
                                                    field.onChange(formatted);
                                                    void applyCepLookup(formatted);
                                                }}
                                            />
                                            {isLoadingCep && (
                                                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-brand-600" />
                                            )}
                                        </div>
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
