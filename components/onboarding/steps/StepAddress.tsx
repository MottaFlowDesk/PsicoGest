"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, AddressValues } from "@/lib/validations/onboarding";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function StepAddress() {
    const { data, updateData, nextStep, prevStep } = useOnboardingStore();
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            cep: data.address?.cep || "",
            street: data.address?.street || "",
            number: data.address?.number || "",
            complement: data.address?.complement || "",
            neighborhood: data.address?.neighborhood || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
        },
    });

    const onSubmit = async (values: AddressValues) => {
        setIsSubmitting(true);
        try {
            updateData("address", values);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { error } = await supabase
                .from('professionals')
                .update({
                    address_zip: values.cep,
                    address_street: values.street,
                    address_number: values.number,
                    address_complement: values.complement,
                    address_neighborhood: values.neighborhood,
                    address_city: values.city,
                    address_state: values.state,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

            if (error) {
                console.error("Error saving address:", error);
                toast.error(error.message || "Erro ao salvar endereço. Tente novamente.");
                throw error;
            }

            nextStep();
        } catch (error: any) {
            console.error("Error saving address:", error);
            if (error.message && !error.message.includes("No user")) {
                toast.error(error.message || "Erro ao salvar endereço. Tente novamente.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            setIsLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    form.setValue('street', data.logradouro);
                    form.setValue('neighborhood', data.bairro);
                    form.setValue('city', data.localidade);
                    form.setValue('state', data.uf);
                    form.setFocus('number');
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            } finally {
                setIsLoadingCep(false);
            }
        }
    };

    return (
        <div className="w-full max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Local de Atendimento</h2>
                <p className="text-slate-500 text-sm">Onde você atende seus pacientes?</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            placeholder="00000-000"
                                            {...field}
                                            onBlur={handleCepBlur}
                                            maxLength={9}
                                        />
                                        {isLoadingCep && (
                                            <div className="absolute right-3 top-2.5">
                                                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-[3fr_1fr] gap-4">
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rua</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Av. Principal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nº</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Complemento (Opcional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sala 101" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="neighborhood"
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

                    <div className="grid grid-cols-[3fr_1fr] gap-4">
                        <FormField
                            control={form.control}
                            name="city"
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
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>UF</FormLabel>
                                    <FormControl>
                                        <Input placeholder="SP" maxLength={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>


                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={prevStep} className="flex-1" disabled={isSubmitting}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                        <Button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Continuar
                            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
