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

export type RevenueBreakdownItem = { label: string; value: number; color: string; barColor: string };

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
    { label: "Comisiones Mercado Libre", value: t.totalCommission, color: "text-[var(--cost-1)]", barColor: "bg-[var(--cost-1)]" },
    { label: "Costo de envío", value: t.totalShipping, color: "text-[var(--cost-2)]", barColor: "bg-[var(--cost-2)]" },
    { label: "Inversión en Publicidad", value: t.totalAds, color: "text-[var(--cost-3)]", barColor: "bg-[var(--cost-3)]" },
    { label: "Retenciones", value: retenciones, color: "text-[var(--cost-4)]", barColor: "bg-[var(--cost-4)]" },
    { label: "Costo de Producto (COGS)", value: t.totalCogs, color: "text-[var(--cost-5)]", barColor: "bg-[var(--cost-5)]" },
    { label: "Gastos Operativos", value: t.totalOperatingCosts, color: "text-[var(--cost-6)]", barColor: "bg-[var(--cost-6)]" },
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
