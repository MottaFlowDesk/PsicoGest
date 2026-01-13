"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const reportTabs = [
  {
    id: "financial",
    label: "Financeiro",
    icon: FileText,
    href: "/dashboard/reports/financial",
  },
  {
    id: "appointments",
    label: "Atendimentos",
    icon: Calendar,
    href: "/dashboard/reports/appointments",
  },
  {
    id: "patients",
    label: "Pacientes",
    icon: Users,
    href: "/dashboard/reports/patients",
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    href: "/dashboard/reports/performance",
  },
];

export default function ReportsPage() {
  const pathname = usePathname();
  const currentTab = reportTabs.find(tab => pathname?.startsWith(tab.href))?.id || "financial";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm mt-1">
          Análises detalhadas e visualizações dos seus dados
        </p>
      </div>

      <Tabs value={currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname?.startsWith(tab.href);
            
            return (
              <Link key={tab.id} href={tab.href} className="w-full">
                <TabsTrigger
                  value={tab.id}
                  className={cn(
                    "w-full flex items-center gap-2",
                    isActive && "bg-brand-50 text-brand-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              </Link>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}

