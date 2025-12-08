"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateAgendaSettings } from "@/app/dashboard/settings/calendar-preferences/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const agendaSettingsSchema = z.object({
    defaultSessionDuration: z.string(),
    defaultSessionInterval: z.string(),
});

type AgendaSettingsFormValues = z.infer<typeof agendaSettingsSchema>;

interface AgendaPreferencesFormProps {
    initialData: {
        default_session_duration?: number;
        default_session_interval?: number;
    } | null;
}

export function AgendaPreferencesForm({ initialData }: AgendaPreferencesFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<AgendaSettingsFormValues>({
        resolver: zodResolver(agendaSettingsSchema),
        defaultValues: {
            defaultSessionDuration: String(initialData?.default_session_duration || 50),
            defaultSessionInterval: String(initialData?.default_session_interval || 0),
        },
    });

    async function onSubmit(data: AgendaSettingsFormValues) {
        setIsLoading(true);
        try {
            await updateAgendaSettings({
                defaultSessionDuration: parseInt(data.defaultSessionDuration),
                defaultSessionInterval: parseInt(data.defaultSessionInterval),
            });
            toast({
                title: "Preferências salvas",
                description: "Suas configurações de agenda foram atualizadas.",
            });
            router.refresh();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível salvar as preferências.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="defaultSessionDuration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Duração Padrão da Sessão</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a duração" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="50">50 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos (1 hora)</SelectItem>
                                    <SelectItem value="90">90 minutos (1h 30m)</SelectItem>
                                    <SelectItem value="120">120 minutos (2 horas)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Duração sugerida ao criar um novo agendamento.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="defaultSessionInterval"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Intervalo entre Sessões</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o intervalo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="0">Sem intervalo (0 min)</SelectItem>
                                    <SelectItem value="5">5 minutos</SelectItem>
                                    <SelectItem value="10">10 minutos</SelectItem>
                                    <SelectItem value="15">15 minutos</SelectItem>
                                    <SelectItem value="20">20 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Tempo de descanso/anotações adicionado automaticamente após cada sessão (gera um bloqueio na agenda).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Preferências
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
