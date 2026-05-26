"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clinicalProfileSchema, ClinicalProfileValues } from "@/lib/validations/onboarding";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Assuming we have this, if not I'll fallback to Input or create it
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Common approaches list
const approaches = [
    "Psicanálise", "Terapia Cognitivo-Comportamental (TCC)", "Gestalt-terapia",
    "Humanista", "Existencial", "Fenomenológica", "Jungian",
    "Comportamental", "Sistêmica", "Integrativa", "Outra"
];

const audiences = ["Crianças", "Adolescentes", "Adultos", "Idosos", "Casais", "Famílias", "Grupos"];

export function StepClinical() {
    const { data, updateData, prevStep, nextStep } = useOnboardingStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const form = useForm<ClinicalProfileValues>({
        resolver: zodResolver(clinicalProfileSchema),
        defaultValues: {
            approach: data.clinical?.approach || "",
            targetAudience: data.clinical?.targetAudience || [],
            specialties: data.clinical?.specialties || [],
            bio: data.clinical?.bio || "",
        },
    });

    const onSubmit = async (values: ClinicalProfileValues) => {
        updateData("clinical", values);
        setIsSubmitting(true);

        // Combine all data
        const fullData = {
            ...data.personal,
            ...data.address,
            ...values,
        };

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Usuário não autenticado");
            }

            // Update professional profile
            // Clean CPF (remove dots, dashes, spaces)
            const cleanCpf = fullData.cpf ? fullData.cpf.replace(/\D/g, '') : null;
            
            const { error } = await supabase
                .from('professionals')
                .update({
                    full_name: fullData.fullName,
                    phone: fullData.phone || null,
                    specialty: fullData.approach || null, // Mapping approach to specialty mostly, or create a new column
                    registration_number: fullData.crp || null,
                    bio: fullData.bio || null,
                    // Address fields
                    address_zip: fullData.cep || null,
                    address_street: fullData.street || null,
                    address_number: fullData.number || null,
                    address_complement: fullData.complement || null,
                    address_neighborhood: fullData.neighborhood || null,
                    address_city: fullData.city || null,
                    address_state: fullData.state || null,

                    // New fields
                    cpf: cleanCpf || null,
                    target_audience: fullData.targetAudience && fullData.targetAudience.length > 0 ? fullData.targetAudience : null,
                    subscription_plan: 'free',
                    subscription_status: 'free',
                })
                .eq('user_id', user.id);

            if (error) {
                console.error("Erro ao salvar perfil:", error);
                toast.error(error.message || "Erro ao salvar perfil clínico. Tente novamente.");
                throw error;
            }

            // Advance to success step
            nextStep();

        } catch (error: any) {
            console.error("Erro ao salvar perfil:", error);
            if (error.message && !error.message.includes("Usuário não autenticado")) {
                toast.error(error.message || "Erro ao salvar perfil clínico. Tente novamente.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Perfil Clínico</h2>
                <p className="text-slate-500 text-sm">Como você trabalha?</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <FormField
                        control={form.control}
                        name="approach"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Abordagem Principal</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione sua abordagem" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {approaches.map((app) => (
                                            <SelectItem key={app} value={app}>{app}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="targetAudience"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Público-Alvo</FormLabel>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {audiences.map((aud) => {
                                        const isSelected = field.value.includes(aud);
                                        return (
                                            <div
                                                key={aud}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        field.onChange(field.value.filter(v => v !== aud));
                                                    } else {
                                                        field.onChange([...field.value, aud]);
                                                    }
                                                }}
                                                className={`
                                    cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                    ${isSelected
                                                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                                                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-brand-300"}
                                `}
                                            >
                                                {aud}
                                            </div>
                                        )
                                    })}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Minibio (Opcional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Fale um pouco sobre sua experiência..."
                                        className="resize-none h-24"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription className="text-xs">
                                    Isso aparecerá no seu perfil público.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />


                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={prevStep} className="flex-1" disabled={isSubmitting}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                        <Button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    Finalizar
                                    <Check className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
