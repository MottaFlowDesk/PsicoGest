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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "@/app/dashboard/settings/profile/actions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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
    initialData: any; // Using any for simplicity as it comes from DB loose shape
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
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

        setIsUploading(true);
        try {
            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            form.setValue("avatarUrl", publicUrl);
            toast({
                title: "Foto enviada",
                description: "Não esqueça de salvar as alterações.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro no upload",
                description: "Não foi possível enviar a imagem.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true);
        try {
            await updateProfile(data);
            toast({
                title: "Perfil atualizado",
                description: "Suas informações foram salvas com sucesso.",
            });
            router.refresh();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao atualizar o perfil.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={form.watch("avatarUrl")} />
                        <AvatarFallback className="text-lg bg-slate-100">
                            {initialData?.full_name?.[0] || <User />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Foto de Perfil</h3>
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
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Alterar foto
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Recomendado: JPG ou PNG. Max 5MB.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Public Info */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Informações Públicas</h3>
                            <p className="text-sm text-slate-500">Isso será visível para seus pacientes.</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>Especialidade</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Psicólogo Clínico, Psicanalista" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Aparece abaixo do seu nome.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="registrationNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Registro Profissional</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: CRP 06/12345" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sobre você (Bio)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Breve descrição sobre sua abordagem e experiência..."
                                            className="h-32 resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Max 500 caracteres.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Contact & Address */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Contato e Endereço</h3>
                            <p className="text-sm text-slate-500">Usado para faturas e contato.</p>
                        </div>

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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="addressZip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <Input placeholder="00000-000" {...field} />
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
                                            <Input placeholder="SP" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="addressStreet"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Logradouro</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Rua..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="addressNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="addressNeighborhood"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bairro</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
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
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                    <Button type="submit" disabled={isLoading || isUploading} className="min-w-[150px]">
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
