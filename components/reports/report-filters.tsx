"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { ReportFilters, PeriodFilter, AppointmentTypeFilter, AppointmentStatusFilter } from "@/lib/reports/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  showAppointmentFilters?: boolean;
  showPatientFilter?: boolean;
}

export function ReportFiltersComponent({
  filters,
  onFiltersChange,
  showAppointmentFilters = false,
  showPatientFilter = false,
}: ReportFiltersProps) {
  const [customStartDate, setCustomStartDate] = useState<string>(
    filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : ""
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : ""
  );

  function handlePeriodChange(period: PeriodFilter) {
    if (period === "custom") {
      onFiltersChange({
        ...filters,
        period,
        startDate: customStartDate ? new Date(customStartDate) : undefined,
        endDate: customEndDate ? new Date(customEndDate) : undefined,
      });
    } else {
      onFiltersChange({
        ...filters,
        period,
        startDate: undefined,
        endDate: undefined,
      });
    }
  }

  function handleCustomDateChange() {
    if (filters.period === "custom") {
      onFiltersChange({
        ...filters,
        startDate: customStartDate ? new Date(customStartDate) : undefined,
        endDate: customEndDate ? new Date(customEndDate) : undefined,
      });
    }
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Período */}
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="period">Período</Label>
          <Select
            value={filters.period}
            onValueChange={(value) => handlePeriodChange(value as PeriodFilter)}
          >
            <SelectTrigger id="period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datas customizadas */}
        {filters.period === "custom" && (
          <>
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setTimeout(handleCustomDateChange, 0);
                }}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setTimeout(handleCustomDateChange, 0);
                }}
                min={customStartDate}
              />
            </div>
          </>
        )}

        {/* Filtros de agendamento */}
        {showAppointmentFilters && (
          <>
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="appointmentType">Tipo</Label>
              <Select
                value={filters.appointmentType || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    appointmentType: value as AppointmentTypeFilter,
                  })
                }
              >
                <SelectTrigger id="appointmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_person">Presencial</SelectItem>
                  <SelectItem value="telehealth">Teleconsulta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="appointmentStatus">Status</Label>
              <Select
                value={filters.appointmentStatus || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    appointmentStatus: value as AppointmentStatusFilter,
                  })
                }
              >
                <SelectTrigger id="appointmentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="no_show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Filtro de paciente */}
        {showPatientFilter && (
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="patient">Paciente</Label>
            <Input
              id="patient"
              placeholder="Buscar paciente..."
              value={filters.patientId || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  patientId: e.target.value || undefined,
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

