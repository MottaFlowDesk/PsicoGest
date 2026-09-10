"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "@/app/dashboard/settings/profile/actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCep, lookupCep } from "@/lib/brazil/cep";

const profileSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    bio: z.string().optional(),
    phone: z.string().optional(),
    specialty: z.string().optional(),
    registrationNumber: z.string().optional(),
    addressZip: z.string().optional(),
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    addressNeighborhood: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    avatarUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    initialData: any;
}

const approaches = [
    "Psicanálise",
    "Terapia Cognitivo-Comportamental (TCC)",
    "Gestalt-terapia",
    "Humanista",
    "Existencial",
    "Fenomenológica",
    "Junguiana",
    "Comportamental",
    "Sistêmica",
    "Integrativa",
    "Outra",
];

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: initialData?.full_name || "",
            bio: initialData?.bio || "",
            phone: initialData?.phone || "",
            specialty: initialData?.specialty || "",
            registrationNumber: initialData?.registration_number || "",
            addressZip: initialData?.address_zip || "",
            addressStreet: initialData?.address_street || "",
            addressNumber: initialData?.address_number || "",
            addressComplement: initialData?.address_complement || "",
            addressNeighborhood: initialData?.address_neighborhood || "",
            addressCity: initialData?.address_city || "",
            addressState: initialData?.address_state || "",
            avatarUrl: initialData?.avatar_url || "",
        },
    });

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Arquivo muito grande", {
                description: "O tamanho máximo é 5MB.",
            });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();
            const fileExt = file.name.split(".").pop();
            const fileName = `${initialData?.id || "avatar"}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(fileName, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(fileName);

            form.setValue("avatarUrl", publicUrl);
            toast.success("Foto enviada!", {
                description: "Clique em 'Salvar' para confirmar a alteração.",
            });
        } catch (error) {
            console.error(error);
            toast.error("Erro no upload", {
                description: "Não foi possível enviar a imagem.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const applyCepLookup = async (rawCep: string) => {
        const cleanCep = rawCep.replace(/\D/g, "");
        if (cleanCep.length !== 8) return;

        try {
            const address = await lookupCep(cleanCep);
            form.setValue("addressStreet", address.street);
            form.setValue("addressNeighborhood", address.neighborhood);
            form.setValue("addressCity", address.city);
            form.setValue("addressState", address.state);
        } catch {
            // Sem aviso: o profissional preenche o endereço na mão.
        }
    };

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true);
        try {
            await updateProfile(data);
            toast.success("Perfil atualizado!", {
                description: "Suas informações foram salvas com sucesso.",
            });
            router.refresh();
        } catch (error) {
            toast.error("Erro ao salvar", {
                description: "Ocorreu um erro ao atualizar o perfil.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <Avatar className="h-24 w-24 ring-4 ring-white shadow-lg">
                        <AvatarImage src={form.watch("avatarUrl") || undefined} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-brand-100 text-brand-700 font-bold">
                            {initialData?.full_name?.[0]?.toUpperCase() || <User className="h-10 w-10" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-slate-900">Foto de Perfil</h3>
                        <p className="text-sm text-slate-500">
                            Esta foto será exibida para seus pacientes.
                        </p>
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="avatar-upload"
                                onChange={handleAvatarUpload}
                                disabled={isUploading || isLoading}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading || isLoading}
                                onClick={() => document.getElementById("avatar-upload")?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {isUploading ? "Enviando..." : "Alterar foto"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Personal Info Section */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Informações Pessoais</h3>
                        <p className="text-sm text-slate-500">Dados básicos do seu perfil profissional.</p>
                    </div>
                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Seu nome" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone / WhatsApp</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(11) 99999-9999" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="registrationNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Registro Profissional (CRP)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: 06/12345" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="specialty"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Abordagem Terapêutica</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione sua abordagem" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {approaches.map((approach) => (
                                                <SelectItem key={approach} value={approach}>
                                                    {approach}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Sobre Você (Bio)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Breve descrição sobre sua abordagem, experiência e especialidades..."
                                            className="min-h-[120px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Esta descrição será visível para seus pacientes. Máx 500 caracteres.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Address Section */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Endereço do Consultório</h3>
                        <p className="text-sm text-slate-500">Usado para faturas e informações de contato.</p>
                    </div>
                    <Separator />

                    <div className="grid gap-6 md:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="addressZip"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CEP</FormLabel>
                                    <FormControl>
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
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressStreet"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Logradouro</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Rua, Avenida..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressComplement"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Complemento</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Apto, Sala..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressNeighborhood"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bairro</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Centro" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressCity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cidade</FormLabel>
                                    <FormControl>
                                        <Input placeholder="São Paulo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="addressState"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <FormControl>
                                        <Input placeholder="SP" maxLength={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button
                        type="submit"
                        disabled={isLoading || isUploading}
                        className="min-w-[180px] bg-brand-600 hover:bg-brand-700"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
