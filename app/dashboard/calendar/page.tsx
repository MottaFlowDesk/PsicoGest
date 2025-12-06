import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CalendarViewManager } from "@/components/calendar/calendar-view-manager";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

export default async function CalendarPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const params = await searchParams;

    // Default to current date if not provided
    const currentDate = params.date ? parseISO(params.date) : new Date();
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    // Fetch appointments for the range
    const { data: appointments } = await supabase
        .from("appointments")
        .select(`
            id,
            scheduled_at,
            type,
            status,
            duration_minutes,
            patients!inner ( full_name )
        `)
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString()) as any;

    return (
        <div className="h-full flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Agenda</h2>
                    <p className="text-slate-500">Gerencie seus atendimentos mensais.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="/dashboard/appointments">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Agendamento
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden h-full">
                <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando calendário...</div>}>
                    <CalendarViewManager
                        appointments={appointments || []}
                    />
                </Suspense>
            </div>
        </div>
    );
}
