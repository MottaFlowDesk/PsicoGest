"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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

  const getPeriodLabel = (period: PeriodFilter): string => {
    const labels: Record<PeriodFilter, string> = {
      today: "Hoje",
      week: "Esta Semana",
      month: "Este Mês",
      quarter: "Este Trimestre",
      year: "Este Ano",
      custom: "Personalizado",
    };
    return labels[period] || period;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
      <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
        {/* Período */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
              Período
              {filters.period !== "month" && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel>Selecione o Período</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filters.period} onValueChange={(value) => handlePeriodChange(value as PeriodFilter)}>
              <DropdownMenuRadioItem value="today">Hoje</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="week">Esta Semana</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="month">Este Mês</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quarter">Este Trimestre</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="year">Este Ano</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="custom">Personalizado</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtros de agendamento */}
        {showAppointmentFilters && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                  Tipo
                  {filters.appointmentType && filters.appointmentType !== "all" && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel>Tipo de Agendamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={filters.appointmentType || "all"} 
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      appointmentType: value as AppointmentTypeFilter,
                    })
                  }
                >
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="in_person">Presencial</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="telehealth">Teleconsulta</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                  Status
                  {filters.appointmentStatus && filters.appointmentStatus !== "all" && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel>Status do Agendamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={filters.appointmentStatus || "all"} 
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      appointmentStatus: value as AppointmentStatusFilter,
                    })
                  }
                >
                  <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="scheduled">Agendado</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="confirmed">Confirmado</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed">Completo</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="no_show">No-Show</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Filtro de paciente */}
        {showPatientFilter && (
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CalendarIcon size={18} className="text-slate-400" />
            </div>
            <Input
              placeholder="Buscar paciente..."
              className="pl-10 border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
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

      {/* Datas customizadas */}
      {filters.period === "custom" && (
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm text-slate-600 whitespace-nowrap">Data Inicial:</Label>
            <Input
              id="startDate"
              type="date"
              className="w-[150px] border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setTimeout(handleCustomDateChange, 0);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm text-slate-600 whitespace-nowrap">Data Final:</Label>
            <Input
              id="endDate"
              type="date"
              className="w-[150px] border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setTimeout(handleCustomDateChange, 0);
              }}
              min={customStartDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}

