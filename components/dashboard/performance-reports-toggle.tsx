"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { PerformanceReportsSection } from "./performance-reports-section";

export function PerformanceReportsToggle() {
  const [showReports, setShowReports] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setShowReports(!showReports)}
          className="flex items-center gap-2"
        >
          <BarChart3 size={18} />
          <span>{showReports ? "Ocultar" : "Ver"} Relatórios de Performance</span>
        </Button>
      </div>
      {showReports && (
        <div className="mt-6">
          <PerformanceReportsSection />
        </div>
      )}
    </>
  );
}

