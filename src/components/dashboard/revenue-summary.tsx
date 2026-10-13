import Link from "next/link";
import { computeRevenueSummary } from "@/lib/revenue-summary";
import { computePeriodProfit } from "@/lib/profitability";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format-money";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { cn } from "@/lib/utils";

export type AttentionRow = {
  productId: string;
  title: string;
  cogs: number;
  availableQuantity: number;
  unitsSold30d: number;
  price: number;
  saleFee: number;
  revenue30d: number;
  commission30d: number;
  shipping30d: number;
};

type AttentionReason = { label: string; tone: "info" | "danger" | "warning" };

// Motivos por los que una publicación necesita atención, en orden de
// severidad. Todo sale de datos que ya existen en la fila — no hay consultas
// nuevas ni valores inventados.
function attentionReason(row: AttentionRow, taxWithholdingPercent: number): { reason: AttentionReason; margin: number | null } {
  const { margin } = computePeriodProfit({
    price: row.price,
    saleFee: row.saleFee,
    cogs: row.cogs,
    unitsSold: row.unitsSold30d,
    revenue: row.revenue30d,
    commission: row.commission30d,
    shipping: row.shipping30d,
    taxWithholdingPercent,
  });

  if (row.availableQuantity <= 0) return { reason: { label: "Sin stock", tone: "danger" }, margin: row.cogs > 0 ? margin : null };
  if (row.cogs <= 0) return { reason: { label: "Sin COGS", tone: "info" }, margin: null };
  if (margin < 15) return { reason: { label: "Margen crítico", tone: "danger" }, margin };

  const daysOfStock = row.unitsSold30d > 0 ? row.availableQuantity / (row.unitsSold30d / 30) : null;
  if (daysOfStock !== null && daysOfStock < 7) {
    return { reason: { label: "Stock < 7 días", tone: "warning" }, margin };
  }
  return { reason: { label: "", tone: "info" }, margin };
}

const REASON_TONES: Record<AttentionReason["tone"], string> = {
  info: "bg-info-bg text-info",
  danger: "bg-danger-bg text-destructive",
  warning: "bg-warning-bg text-warning",
};

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-[3px] hover:border-line-hi hover:shadow-[0_18px_36px_-20px_var(--glow)]">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-[22px] leading-none font-bold tracking-[-0.02em] tabular-nums">{value}</p>
      {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function SideCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
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
  attentionRows,
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
  attentionRows: AttentionRow[];
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

  const withoutCogs = attentionRows.filter((row) => row.cogs <= 0).length;

  const attention = attentionRows
    .map((row) => ({ row, ...attentionReason(row, taxWithholdingPercent) }))
    .filter((entry) => entry.reason.label !== "")
    .slice(0, 6);

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      {withoutCogs > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--banner-warning-border)] bg-[var(--banner-warning-bg)] px-5 py-3.5">
          <p className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-warning shadow-[0_0_10px_2px_var(--warning)]" />
            <span>
              <span className="font-semibold">
                {withoutCogs} {withoutCogs === 1 ? "publicación sin costo asignado" : "publicaciones sin costo asignado"}.
              </span>{" "}
              Tu utilidad puede estar sobreestimada.
            </span>
          </p>
          <Link
            href="/dashboard/costos-gastos?tab=cogs"
            className="rounded-[10px] bg-foreground px-3.5 py-2 text-[13px] font-bold text-background transition-opacity hover:opacity-90"
          >
            Asignar COGS →
          </Link>
        </div>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Kpi
          label="Ventas reales"
          value={formatMoney(totalRevenue, currencyId)}
          note={`${formatNumber(totalUnits)} unidades`}
        />
        <Kpi label="Unidades vendidas" value={formatNumber(totalUnits)} note={`últimos ${days} días`} />
        <Kpi
          label="Comisiones ML"
          value={formatMoney(-totalCommission, currencyId)}
          note={`${formatPercent(totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0)} de ventas`}
        />
        <Kpi
          label="Costo de envío"
          value={formatMoney(-totalShipping, currencyId)}
          note="envío gratis asumido"
        />
        <Kpi label="Publicidad" value={formatMoney(-totalAds, currencyId)} note="Product Ads" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="rounded-[22px] border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">¿A dónde se va cada peso?</h3>
            <span className="text-xs text-muted-foreground">% sobre ventas reales</span>
          </div>

          <div className="mt-4 flex h-4 w-full gap-[3px]">
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
              className="h-full rounded-full bg-secondary shadow-[0_0_12px_0_var(--glow-secondary)] transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ width: `${Math.max(margenNeto, 0)}%` }}
              title="Utilidad"
            />
          </div>

          <div className="mt-4 space-y-0.5">
            {breakdown.map((item) => {
              const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
              return (
                <div
                  key={item.label}
                  className="grid grid-cols-[14px_1fr_130px_60px] items-center gap-2 rounded-[10px] px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.barColor}`} />
                  <span className="truncate">{item.label}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatMoney(-item.value, currencyId)}
                  </span>
                  <span className="text-right text-muted-foreground tabular-nums">{formatPercent(pct)}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-[14px_1fr_130px_60px] items-center gap-2 rounded-xl bg-muted px-2 py-2.5 text-sm font-bold">
              <span />
              <span>Total costos</span>
              <span className="text-right tabular-nums">{formatMoney(-totalCosts, currencyId)}</span>
              <span className="text-right tabular-nums">
                {formatPercent(totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-[22px] border border-[rgba(127,148,255,0.2)] bg-[linear-gradient(160deg,#0A0C1A,#171C42)] p-5 text-white shadow-[0_30px_60px_-24px_var(--glow-secondary)]">
            <div
              className="animate-float pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-[#34CFE0] opacity-20 blur-[70px]"
              aria-hidden
            />
            <div className="relative flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34CFE0] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34CFE0]" />
              </span>
              <p className="text-[13px] font-semibold text-[#7FE3EE]">Utilidad neta</p>
            </div>
            <p className="relative mt-2 font-display text-[40px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
              <AnimatedNumber value={utilidadNeta} currencyId={currencyId} />
            </p>
            <p className="relative mt-2 text-sm text-[#C5C8DA]">
              {formatPercent(margenNeto)} de margen neto · {days} días
            </p>
          </div>

          {breakEvenUnits !== null && (
            <SideCard label="Break-even" value={`${formatNumber(breakEvenUnits)} uds`} />
          )}
          <SideCard label="Ventas reales" value={formatMoney(totalRevenue, currencyId)} />

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/rentabilidad"
              className="rounded-[14px] bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent/70"
            >
              Margen por producto →
            </Link>
            <Link
              href="/dashboard/costos-gastos"
              className="rounded-[14px] bg-accent px-4 py-3 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent/70"
            >
              Gestionar costos →
            </Link>
          </div>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="rounded-[22px] border border-border bg-card p-5">
          <h3 className="font-display text-lg font-bold">Publicaciones que requieren atención</h3>
          <div className="mt-3">
            {attention.map(({ row, reason, margin }) => (
              <div
                key={row.productId}
                className="grid grid-cols-[1fr_90px_120px_auto] items-center gap-3 rounded-[10px] px-2 py-3 text-sm transition-colors hover:bg-muted"
              >
                <span className="truncate font-semibold">{row.title}</span>
                <span className="text-right tabular-nums">
                  {margin === null ? "—" : formatPercent(margin)}
                </span>
                <span className="text-right text-muted-foreground tabular-nums">
                  {formatNumber(row.availableQuantity)} uds
                </span>
                <span
                  className={cn(
                    "justify-self-end rounded-full px-2.5 py-1 text-xs font-semibold",
                    REASON_TONES[reason.tone],
                  )}
                >
                  {reason.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
