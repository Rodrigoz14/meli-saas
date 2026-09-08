import {
  Banknote,
  Receipt,
  ShoppingCart,
  Truck,
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
  taxWithholdingPercent,
}: {
  currencyId: string;
  totalRevenue: number;
  totalUnits: number;
  totalCommission: number;
  totalShipping: number;
  totalCogs: number;
  totalOperatingCosts: number;
  taxWithholdingPercent: number;
}) {
  const retenciones = totalRevenue * (taxWithholdingPercent / 100);
  const totalCosts = totalCommission + totalShipping + totalCogs + totalOperatingCosts + retenciones;
  const utilidadNeta = totalRevenue - totalCosts;
  const margenNeto = totalRevenue > 0 ? (utilidadNeta / totalRevenue) * 100 : 0;

  const contributionMarginPerUnit =
    totalUnits > 0 ? (totalRevenue - totalCommission - totalShipping - totalCogs) / totalUnits : 0;
  const breakEvenUnits =
    contributionMarginPerUnit > 0
      ? Math.ceil((totalOperatingCosts + retenciones) / contributionMarginPerUnit)
      : null;

  const breakdown = [
    { label: "Comisiones Mercado Libre", value: totalCommission, color: "text-orange-500" },
    { label: "Costo de envío", value: totalShipping, color: "text-cyan-500" },
    { label: "Retenciones", value: retenciones, color: "text-amber-500" },
    { label: "Costo de producto (COGS)", value: totalCogs, color: "text-rose-500" },
    { label: "Gastos operativos", value: totalOperatingCosts, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-primary">
            <Banknote className="h-5 w-5" />
            <span className="text-sm font-medium">Ventas Reales (30d)</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold">
            {formatMoney(totalRevenue, currencyId)}
          </p>
        </div>
        <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-6">
          <div className="flex items-center gap-2 text-secondary">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">Unidades Vendidas</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold">{totalUnits}</p>
        </div>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6">
          <div className="flex items-center gap-2 text-orange-500">
            <Receipt className="h-5 w-5" />
            <span className="text-sm font-medium">Comisiones Mercado Libre</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-orange-500">
            -{formatMoney(totalCommission, currencyId)}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="flex items-center gap-2 text-cyan-500">
            <Truck className="h-5 w-5" />
            <span className="text-sm font-medium">Costo de Envío</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-cyan-500">
            -{formatMoney(totalShipping, currencyId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">envío gratis asumido por ti</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8">
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
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold">Desglose de costos (30d)</h3>
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
