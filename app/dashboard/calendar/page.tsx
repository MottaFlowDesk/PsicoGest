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

    if (!user) return <div>Access Denied</div>;

    // Get Professional ID
    const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!professional) return <div>Professional Profile Not Found</div>;

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

    // Fetch professional availability
    const { data: availability } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professional.id);



    return (
        <div className="flex flex-col space-y-4 h-full">


            <div className="flex-1 min-h-0">
                <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando calendário...</div>}>
                    <CalendarViewManager
                        appointments={appointments || []}
                        availability={availability || []}
                    />
                </Suspense>
            </div>
        </div>
    );
}
