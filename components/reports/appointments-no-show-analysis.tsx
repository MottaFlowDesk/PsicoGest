"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatPercentage } from "@/lib/reports/utils";

interface AppointmentsNoShowAnalysisProps {
  data: { period: string; total: number; noShows: number; rate: number }[];
}

export function AppointmentsNoShowAnalysis({ data }: AppointmentsNoShowAnalysisProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#64748b" fontSize={12} tickLine={false} />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
          formatter={(value: number) => formatPercentage(value)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: "#f59e0b", r: 4 }}
          name="Taxa de No-Show (%)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

