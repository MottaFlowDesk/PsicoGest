"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/reports/utils";

interface PerformanceOverviewProps {
  trends: { period: string; revenue: number; appointments: number; patients: number }[];
}

export function PerformanceOverview({ trends }: PerformanceOverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
        <YAxis
          yAxisId="left"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
          formatter={(value: number, name: string) => {
            if (name === "Receita") {
              return formatCurrency(value);
            }
            return value;
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Receita (R$)" />
        <Line yAxisId="right" type="monotone" dataKey="appointments" stroke="#10b981" strokeWidth={2} name="Atendimentos" />
        <Line yAxisId="right" type="monotone" dataKey="patients" stroke="#f59e0b" strokeWidth={2} name="Pacientes" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

