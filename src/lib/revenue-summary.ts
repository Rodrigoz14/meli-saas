import type { SummaryExportRow } from "@/components/dashboard/export-summary-button";

export type RevenueSummaryTotals = {
  totalRevenue: number;
  totalUnits: number;
  totalCommission: number;
  totalShipping: number;
  totalCogs: number;
  totalOperatingCosts: number;
  totalAds: number;
  taxWithholdingPercent: number;
};

export type RevenueBreakdownItem = { label: string; value: number; color: string };

export type RevenueSummaryComputed = {
  retenciones: number;
  totalCosts: number;
  utilidadNeta: number;
  margenNeto: number;
  breakEvenUnits: number | null;
  breakdown: RevenueBreakdownItem[];
  exportRows: SummaryExportRow[];
};

// Compartido entre RevenueSummary (tarjetas del Dashboard) y la página misma
// (para armar el export junto al selector de período) — así el cálculo del
// P&L (retenciones, break-even, etc.) vive en un solo lugar.
export function computeRevenueSummary(t: RevenueSummaryTotals): RevenueSummaryComputed {
  const retenciones = t.totalRevenue * (t.taxWithholdingPercent / 100);
  const totalCosts =
    t.totalCommission + t.totalShipping + t.totalCogs + t.totalOperatingCosts + t.totalAds + retenciones;
  const utilidadNeta = t.totalRevenue - totalCosts;
  const margenNeto = t.totalRevenue > 0 ? (utilidadNeta / t.totalRevenue) * 100 : 0;

  const contributionMarginPerUnit =
    t.totalUnits > 0 ? (t.totalRevenue - t.totalCommission - t.totalShipping - t.totalCogs) / t.totalUnits : 0;
  const breakEvenUnits =
    contributionMarginPerUnit > 0
      ? Math.ceil((t.totalOperatingCosts + t.totalAds + retenciones) / contributionMarginPerUnit)
      : null;

  const breakdown: RevenueBreakdownItem[] = [
    { label: "Comisiones Mercado Libre", value: t.totalCommission, color: "text-orange-500" },
    { label: "Costo de envío", value: t.totalShipping, color: "text-cyan-500" },
    { label: "Inversión en Publicidad", value: t.totalAds, color: "text-violet-500" },
    { label: "Retenciones", value: retenciones, color: "text-amber-500" },
    { label: "Costo de Producto (COGS)", value: t.totalCogs, color: "text-rose-500" },
    { label: "Gastos Operativos", value: t.totalOperatingCosts, color: "text-slate-400" },
  ];

  const exportRows: SummaryExportRow[] = [
    { label: "Ventas Reales", value: t.totalRevenue, pctOfRevenue: null },
    { label: "Unidades Vendidas", value: t.totalUnits, pctOfRevenue: null },
    ...breakdown.map((item) => ({
      label: item.label,
      value: item.value,
      pctOfRevenue: t.totalRevenue > 0 ? (item.value / t.totalRevenue) * 100 : 0,
    })),
    {
      label: "Total Costos",
      value: totalCosts,
      pctOfRevenue: t.totalRevenue > 0 ? (totalCosts / t.totalRevenue) * 100 : 0,
    },
    { label: "Utilidad Neta", value: utilidadNeta, pctOfRevenue: margenNeto },
    ...(breakEvenUnits !== null
      ? [{ label: "Break-even (unidades)", value: breakEvenUnits, pctOfRevenue: null }]
      : []),
  ];

  return { retenciones, totalCosts, utilidadNeta, margenNeto, breakEvenUnits, breakdown, exportRows };
}
