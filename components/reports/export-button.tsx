"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { ExportOptions } from "@/lib/reports/types";
import { toast } from "sonner";

interface ExportButtonProps {
  reportType: ExportOptions["reportType"];
  filters: ExportOptions["filters"];
  disabled?: boolean;
}

export function ExportButton({ reportType, filters, disabled = false }: ExportButtonProps) {
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  async function handleExport(format: "pdf" | "excel") {
    setExporting(format);
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          reportType,
          filters,
        } as ExportOptions),
      });

      if (!response.ok) {
        throw new Error("Erro ao exportar relatório");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${reportType}-${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar relatório. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || exporting !== null}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={exporting !== null}
        >
          <Table className="mr-2 h-4 w-4" />
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

