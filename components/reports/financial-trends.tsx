"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency, formatPercentage } from "@/lib/reports/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialTrendsProps {
  trends: { period: string; current: number; previous: number; change: number }[];
}

export function FinancialTrends({ trends }: FinancialTrendsProps) {
  const chartData = trends.map(trend => ({
    name: trend.period,
    Atual: trend.current,
    Anterior: trend.previous,
    change: trend.change,
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
          <Bar dataKey="Atual" fill="#3b82f6" name="Período Atual" />
          <Bar dataKey="Anterior" fill="#94a3b8" name="Período Anterior" />
        </BarChart>
      </ResponsiveContainer>

      {trends.map((trend, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-sm">{trend.period}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Atual</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(trend.current)}</p>
              </div>
              <div>
                <p className="text-slate-500">Anterior</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(trend.previous)}</p>
              </div>
              <div>
                <p className="text-slate-500">Variação</p>
                <p className={`text-lg font-semibold ${trend.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPercentage(trend.change)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

