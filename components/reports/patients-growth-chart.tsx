"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PatientsGrowthChartProps {
  data: { period: string; newPatients: number; totalPatients: number; activePatients: number }[];
}

export function PatientsGrowthChart({ data }: PatientsGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        <Line type="monotone" dataKey="newPatients" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} name="Novos" />
        <Line type="monotone" dataKey="totalPatients" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} name="Total" />
        <Line type="monotone" dataKey="activePatients" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} name="Ativos" />
      </LineChart>
    </ResponsiveContainer>
  );
}

