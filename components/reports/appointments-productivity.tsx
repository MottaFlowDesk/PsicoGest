"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDuration } from "@/lib/reports/utils";

interface AppointmentsProductivityProps {
  data: { period: string; sessions: number; hours: number; averagePerDay: number }[];
}

export function AppointmentsProductivity({ data }: AppointmentsProductivityProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Area type="monotone" dataKey="sessions" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Sessões" />
        <Area type="monotone" dataKey="hours" stackId="2" stroke="#10b981" fill="#10b981" name="Horas" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

