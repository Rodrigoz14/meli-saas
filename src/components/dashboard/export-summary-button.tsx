"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SummaryExportRow = { label: string; value: number; pctOfRevenue: number | null };

export function ExportSummaryButton({ days, rows }: { days: number; rows: SummaryExportRow[] }) {
  function buildRows(): (string | number)[][] {
    const header = ["Concepto", `Monto (${days}d)`, "% de ventas"];
    return [
      header,
      ...rows.map((r) => [r.label, r.value, r.pctOfRevenue === null ? "" : Number(r.pctOfRevenue.toFixed(1))]),
    ];
  }

  function filename(ext: string) {
    return `dashboard-resumen-${days}d-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  function handleExportCsv() {
    const data = buildRows();
    const csv = data.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename("csv");
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportXlsx() {
    const data = buildRows();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen");
    XLSX.writeFile(workbook, filename("xlsx"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
        <Download className="h-3.5 w-3.5" /> Exportar resumen
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCsv}>Descargar CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportXlsx}>Descargar XLSX</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
