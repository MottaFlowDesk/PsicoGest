"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalInfoSchema, PersonalInfoValues } from "@/lib/validations/onboarding";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export function StepPersonal() {
    const { data, updateData, nextStep } = useOnboardingStore();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const form = useForm<PersonalInfoValues>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: {
            fullName: data.personal?.fullName || "",
            cpf: data.personal?.cpf || "",
            crp: data.personal?.crp || "",
            phone: data.personal?.phone || "",
            whatsapp: data.personal?.whatsapp || "",
        },
    });

    const onSubmit = async (values: PersonalInfoValues) => {
        setIsLoading(true);
        try {
            updateData("personal", values);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // Upsert personal info. Note: we use upsert to create if not exists
            // Clean CPF (remove dots, dashes, spaces)
            const cleanCpf = values.cpf ? values.cpf.replace(/\D/g, '') : null;
            
            const { error } = await supabase
                .from('professionals')
                .upsert({
                    user_id: user.id,
                    email: user.email,
                    full_name: values.fullName,
                    cpf: cleanCpf || null,
                    registration_number: values.crp || null,
                    phone: values.phone || null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) {
                console.error("Error saving personal info:", error);
                toast.error(error.message || "Erro ao salvar dados pessoais. Tente novamente.");
                throw error;
            }

            nextStep();
        } catch (error: any) {
            console.error("Error saving personal info:", error);
            if (error.message && !error.message.includes("No user found")) {
                toast.error(error.message || "Erro ao salvar dados pessoais. Tente novamente.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Sobre Você</h2>
                <p className="text-slate-500 text-sm">Preencha seus dados profissionais</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Seu nome" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
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
                            name="crp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CRP</FormLabel>
                                    <FormControl>
                                        <Input placeholder="00/00000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                    <Input placeholder="(00) 00000-0000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>WhatsApp (Opcional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="(00) 00000-0000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 mt-4" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Continuar
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
