"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PatientsActivityProps {
  data: { period: string; active: number; inactive: number; new: number }[];
}

export function PatientsActivity({ data }: PatientsActivityProps) {
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
        <Bar dataKey="active" fill="#10b981" name="Ativos" />
        <Bar dataKey="inactive" fill="#6b7280" name="Inativos" />
        <Bar dataKey="new" fill="#3b82f6" name="Novos" />
      </BarChart>
    </ResponsiveContainer>
  );
}

