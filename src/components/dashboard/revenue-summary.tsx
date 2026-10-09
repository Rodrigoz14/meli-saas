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
import { computeRevenueSummary } from "@/lib/revenue-summary";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AnimatedNumber } from "@/components/dashboard/animated-number";

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
  days,
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
  days: number;
}) {
  const { totalCosts, utilidadNeta, margenNeto, breakEvenUnits, breakdown } = computeRevenueSummary({
    totalRevenue,
    totalUnits,
    totalCommission,
    totalShipping,
    totalCogs,
    totalOperatingCosts,
    totalAds,
    taxWithholdingPercent,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard
          label={`Ventas Reales (${days}d)`}
          value={formatMoney(totalRevenue, currencyId)}
          icon={Banknote}
          tone="primary"
        />
        <KpiCard label="Unidades Vendidas" value={totalUnits} icon={ShoppingCart} tone="secondary" />
        <KpiCard
          label="Comisiones Mercado Libre"
          value={`-${formatMoney(totalCommission, currencyId)}`}
          icon={Receipt}
          tone="warning"
        />
        <KpiCard
          label="Costo de Envío"
          value={`-${formatMoney(totalShipping, currencyId)}`}
          hint="envío gratis asumido por ti"
          icon={Truck}
          tone="neutral"
        />
      </div>

      <KpiCard
        label="Inversión en Publicidad"
        value={`-${formatMoney(totalAds, currencyId)}`}
        hint={`últimos ${days} días`}
        icon={Target}
        tone="neutral"
        className="md:max-w-xs"
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Costos Operativos (Propios)
          </h3>
          <Link href="/dashboard/costos-gastos" className="text-xs text-primary hover:underline">
            Gestionar Costos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <KpiCard
            label="Costo de Producto (COGS)"
            value={`-${formatMoney(totalCogs, currencyId)}`}
            hint={`${totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : "0.0"}% de ventas`}
            icon={Package}
            tone="danger"
          />
          <KpiCard
            label="Gastos Operativos"
            value={`-${formatMoney(totalOperatingCosts, currencyId)}`}
            hint={`${totalRevenue > 0 ? ((totalOperatingCosts / totalRevenue) * 100).toFixed(1) : "0.0"}% de ventas`}
            icon={Wallet}
            tone="neutral"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">¿A dónde se va cada peso?</h3>
          <div className="mt-4 flex h-4 w-full gap-[3px] overflow-hidden rounded-full">
            {breakdown.map((item) => {
              const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
              return (
                <div
                  key={item.label}
                  className={`${item.barColor} h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]`}
                  style={{ width: `${Math.max(pct, 0)}%` }}
                  title={item.label}
                />
              );
            })}
            <div
              className="h-full rounded-full bg-success transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ width: `${Math.max(margenNeto, 0)}%` }}
              title="Utilidad"
            />
          </div>

          <div className="mt-3 space-y-1">
            {breakdown.map((item) => {
              const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${item.barColor}`} />
                    {item.label}
                  </span>
                  <span className={item.color}>
                    {formatMoney(item.value, currencyId)}{" "}
                    <span className="text-xs text-muted-foreground/70">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between rounded-lg bg-muted px-2 py-1.5 font-semibold">
              <span>Total costos</span>
              <span className="text-destructive">{formatMoney(totalCosts, currencyId)}</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[rgba(127,148,255,0.2)] bg-[linear-gradient(160deg,#0A0C1A,#171C42)] p-5 text-white shadow-[0_30px_60px_-24px_var(--glow-secondary)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34CFE0] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34CFE0]" />
            </span>
            <p className="text-xs font-semibold tracking-wide text-[#7FE3EE] uppercase">Utilidad neta</p>
          </div>
          <p className="mt-2 font-display text-[40px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
            <AnimatedNumber value={utilidadNeta} format={(n) => formatMoney(n, currencyId)} />
          </p>
          <p className="mt-2 text-sm text-[#C5C8DA]">
            {margenNeto.toFixed(1)}% de margen neto
            {breakEvenUnits !== null ? ` · break-even en ${breakEvenUnits} uds` : ""}
          </p>

          <div className="mt-4 flex flex-col gap-2 border-t border-[rgba(127,148,255,0.2)] pt-4 text-sm">
            <Link href="/dashboard/rentabilidad" className="text-[#A9B7FF] hover:underline">
              Margen por producto →
            </Link>
            <Link href="/dashboard/costos-gastos" className="text-[#A9B7FF] hover:underline">
              Gestionar costos →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
