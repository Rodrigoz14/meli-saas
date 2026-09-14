import Link from "next/link";
import {
  Banknote,
  Package,
  Receipt,
  ShoppingCart,
  Target,
  Truck,
  Wallet,
} from "lucide-react";

function formatMoney(value: number, currencyId: string) {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyId,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

export function RevenueSummary({
  currencyId,
  totalRevenue,
  totalUnits,
  totalCommission,
  totalShipping,
  totalCogs,
  totalOperatingCosts,
  totalAds,
  taxWithholdingPercent,
}: {
  currencyId: string;
  totalRevenue: number;
  totalUnits: number;
  totalCommission: number;
  totalShipping: number;
  totalCogs: number;
  totalOperatingCosts: number;
  totalAds: number;
  taxWithholdingPercent: number;
}) {
  const retenciones = totalRevenue * (taxWithholdingPercent / 100);
  const totalCosts =
    totalCommission + totalShipping + totalCogs + totalOperatingCosts + totalAds + retenciones;
  const utilidadNeta = totalRevenue - totalCosts;
  const margenNeto = totalRevenue > 0 ? (utilidadNeta / totalRevenue) * 100 : 0;

  const contributionMarginPerUnit =
    totalUnits > 0 ? (totalRevenue - totalCommission - totalShipping - totalCogs) / totalUnits : 0;
  const breakEvenUnits =
    contributionMarginPerUnit > 0
      ? Math.ceil((totalOperatingCosts + totalAds + retenciones) / contributionMarginPerUnit)
      : null;

  const breakdown = [
    { label: "Comisiones Mercado Libre", value: totalCommission, color: "text-orange-500" },
    { label: "Costo de envío", value: totalShipping, color: "text-cyan-500" },
    { label: "Inversión en Publicidad", value: totalAds, color: "text-violet-500" },
    { label: "Retenciones", value: retenciones, color: "text-amber-500" },
    { label: "Costo de Producto (COGS)", value: totalCogs, color: "text-rose-500" },
    { label: "Gastos Operativos", value: totalOperatingCosts, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="group rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-[0_0_20px_-12px_rgba(99,102,241,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(99,102,241,0.85)]">
          <div className="flex items-center gap-2 text-primary">
            <Banknote className="h-5 w-5" />
            <span className="text-sm font-medium">Ventas Reales (30d)</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight">
            {formatMoney(totalRevenue, currencyId)}
          </p>
        </div>
        <div className="group rounded-2xl border border-secondary/20 bg-secondary/5 p-6 shadow-[0_0_20px_-12px_rgba(20,184,166,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(20,184,166,0.85)]">
          <div className="flex items-center gap-2 text-secondary">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">Unidades Vendidas</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight">{totalUnits}</p>
        </div>
        <div className="group rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 shadow-[0_0_20px_-12px_rgba(249,115,22,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(249,115,22,0.85)]">
          <div className="flex items-center gap-2 text-orange-500">
            <Receipt className="h-5 w-5" />
            <span className="text-sm font-medium">Comisiones Mercado Libre</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-orange-500">
            -{formatMoney(totalCommission, currencyId)}
          </p>
        </div>
        <div className="group rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-[0_0_20px_-12px_rgba(6,182,212,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(6,182,212,0.85)]">
          <div className="flex items-center gap-2 text-cyan-500">
            <Truck className="h-5 w-5" />
            <span className="text-sm font-medium">Costo de Envío</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-cyan-500">
            -{formatMoney(totalShipping, currencyId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">envío gratis asumido por ti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="group rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 shadow-[0_0_20px_-12px_rgba(139,92,246,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(139,92,246,0.85)]">
          <div className="flex items-center gap-2 text-violet-500">
            <Target className="h-5 w-5" />
            <span className="text-sm font-medium">Inversión en Publicidad</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-violet-500">
            -{formatMoney(totalAds, currencyId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">últimos 30 días</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Costos Operativos (Propios)
          </h3>
          <Link href="/dashboard/costos-gastos" className="text-xs text-primary hover:underline">
            Gestionar Costos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="group rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-[0_0_20px_-12px_rgba(244,63,94,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(244,63,94,0.85)]">
            <div className="flex items-center gap-2 text-rose-500">
              <Package className="h-5 w-5" />
              <span className="text-sm font-medium">Costo de Producto (COGS)</span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-rose-500">
              -{formatMoney(totalCogs, currencyId)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : "0.0"}% de ventas
            </p>
          </div>
          <div className="group rounded-2xl border border-slate-400/20 bg-slate-400/5 p-6 shadow-[0_0_20px_-12px_rgba(148,163,184,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(148,163,184,0.75)]">
            <div className="flex items-center gap-2 text-slate-400">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium">Gastos Operativos</span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-400">
              -{formatMoney(totalOperatingCosts, currencyId)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalRevenue > 0 ? ((totalOperatingCosts / totalRevenue) * 100).toFixed(1) : "0.0"}% de ventas
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8 shadow-[0_0_32px_-14px_rgba(16,185,129,0.6)]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Ventas Reales</p>
            <p className="mt-1 font-display text-xl font-bold">
              {formatMoney(totalRevenue, currencyId)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">(-) Total Costos</p>
            <p className="mt-1 font-display text-xl font-bold text-rose-500">
              -{formatMoney(totalCosts, currencyId)}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              = Utilidad Neta
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-emerald-500">
              {formatMoney(utilidadNeta, currencyId)}
            </p>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">% Margen Neto</p>
              <p className="font-display text-xl font-bold text-emerald-500">
                {margenNeto.toFixed(1)}%
              </p>
            </div>
            {breakEvenUnits !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Break-even</p>
                <p className="font-semibold text-amber-500">{breakEvenUnits} uds</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link href="/dashboard/rentabilidad" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
            Ver margen de contribución y detalle por producto →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Desglose de costos (30d)</h3>
          <Link href="/dashboard/rentabilidad" className="text-xs text-primary hover:underline">
            Ver por publicación →
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {breakdown.map((item) => {
            const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className={item.color}>
                  {formatMoney(item.value, currencyId)}{" "}
                  <span className="text-xs text-muted-foreground/70">
                    ({pct.toFixed(1)}%)
                  </span>
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 font-semibold">
            <span>Total costos</span>
            <span className="text-rose-500">{formatMoney(totalCosts, currencyId)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
