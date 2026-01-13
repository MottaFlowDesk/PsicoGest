"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AppointmentsVolumeChartProps {
  data: { period: string; count: number; completed: number; cancelled: number; noShow: number }[];
}

export function AppointmentsVolumeChart({ data }: AppointmentsVolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        <Bar dataKey="count" fill="#3b82f6" name="Total" />
        <Bar dataKey="completed" fill="#10b981" name="Completos" />
        <Bar dataKey="cancelled" fill="#ef4444" name="Cancelados" />
        <Bar dataKey="noShow" fill="#f59e0b" name="No-Show" />
      </BarChart>
    </ResponsiveContainer>
  );
}

