"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Get professional ID
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional not found");
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Parallel queries for better performance
    const [
        activePatientsResult,
        weekAppointmentsResult,
        monthRevenueResult,
        noShowRateResult,
        previousMonthRevenueResult,
    ] = await Promise.all([
        // Active patients count
        supabase
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("professional_id", professional.id)
            .eq("archived", false),

        // Appointments this week
        supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("professional_id", professional.id)
            .gte("scheduled_at", weekStart.toISOString())
            .lte("scheduled_at", weekEnd.toISOString()),

        // Revenue this month (paid invoices)
        supabase
            .from("invoices")
            .select("amount")
            .eq("professional_id", professional.id)
            .eq("status", "paid")
            .gte("paid_at", monthStart.toISOString())
            .lte("paid_at", monthEnd.toISOString()),

        // No-show appointments (last 30 days for rate calculation)
        supabase
            .from("appointments")
            .select("status", { count: "exact" })
            .eq("professional_id", professional.id)
            .gte("scheduled_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .lte("scheduled_at", now.toISOString()),

        // Previous month revenue for comparison
        supabase
            .from("invoices")
            .select("amount")
            .eq("professional_id", professional.id)
            .eq("status", "paid")
            .gte("paid_at", new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).toISOString())
            .lt("paid_at", monthStart.toISOString()),
    ]);

    // Calculate stats
    const activePatients = activePatientsResult.count || 0;
    const weekAppointments = weekAppointmentsResult.count || 0;

    const monthRevenue = monthRevenueResult.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const previousMonthRevenue = previousMonthRevenueResult.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const revenueChange = previousMonthRevenue > 0
        ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1)
        : "0";

    const totalAppointments = noShowRateResult.count || 0;
    const noShowCount = noShowRateResult.data?.filter(apt => apt.status === "no_show").length || 0;
    const noShowRate = totalAppointments > 0 ? ((noShowCount / totalAppointments) * 100).toFixed(1) : "0";

    return {
        activePatients,
        weekAppointments,
        monthRevenue,
        revenueChange: parseFloat(revenueChange),
        noShowRate: parseFloat(noShowRate),
    };
}

export async function getUpcomingSessions() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        throw new Error("Professional not found");
    }

    const now = new Date();

    const { data: appointments } = await supabase
        .from("appointments")
        .select(`
            id,
            scheduled_at,
            type,
            status,
            duration_minutes,
            patients (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq("professional_id", professional.id)
        .gte("scheduled_at", now.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

    return appointments || [];
}
