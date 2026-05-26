"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/reports/utils";
import { PerformanceReportData } from "@/lib/reports/types";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, AlertCircle, BarChart3 } from "lucide-react";

interface KPICardsProps {
  data: PerformanceReportData;
}

export function KPICards({ data }: KPICardsProps) {
  const { kpis } = data;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.current)}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.revenue.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.revenue.change >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(Math.abs(kpis.revenue.change))}
              </span>
              <span className="text-slate-500 ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.appointments.current}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.appointments.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.appointments.change >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(Math.abs(kpis.appointments.change))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.patients.current}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.patients.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.patients.change >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(Math.abs(kpis.patients.change))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa No-Show</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(kpis.noShowRate.current)}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.noShowRate.change <= 0 ? (
                <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingUp className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.noShowRate.change <= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(Math.abs(kpis.noShowRate.change))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita/Sessão</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.averageRevenuePerSession.current)}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.averageRevenuePerSession.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.averageRevenuePerSession.change >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(Math.abs(kpis.averageRevenuePerSession.change))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

