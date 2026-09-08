import { AlertTriangle, PieChart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function SummaryCards({
  totalNetProfit,
  currencyId,
  killers,
  regulares,
  criticos,
  withCost,
  totalProducts,
}: {
  totalNetProfit: number;
  currencyId: string;
  killers: number;
  regulares: number;
  criticos: number;
  withCost: number;
  totalProducts: number;
}) {
  const missing = totalProducts - withCost;
  const completeness = totalProducts > 0 ? Math.round((withCost / totalProducts) * 100) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">Margen de Contribución Total</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Disponible para gastos operativos (últimos 30 días)
        </p>
        <p className="mt-3 font-display text-3xl font-bold text-emerald-500">
          {formatMoney(totalNetProfit, currencyId)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PieChart className="h-4 w-4" />
          <span className="text-sm font-medium">Salud del Portafolio</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">Distribución por rentabilidad</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <p className="text-2xl font-bold text-emerald-500">{killers}</p>
            <p className="text-[11px] uppercase text-muted-foreground">Killers ≥30%</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3">
            <p className="text-2xl font-bold text-amber-500">{regulares}</p>
            <p className="text-[11px] uppercase text-muted-foreground">Regulares 15-29%</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-2xl font-bold text-destructive">{criticos}</p>
            <p className="text-[11px] uppercase text-muted-foreground">Críticos &lt;15%</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Completitud de Costos</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">Integridad de datos de COGS</p>
        <div className="mt-3 flex items-center gap-4">
          <span
            className={cn(
              "font-display text-3xl font-bold",
              completeness === 100 ? "text-emerald-500" : "text-amber-500",
            )}
          >
            {completeness}%
          </span>
          <p className="text-sm text-muted-foreground">
            {missing > 0
              ? `Faltan ${missing} producto${missing === 1 ? "" : "s"} sin costo asignado`
              : "Todos tus productos tienen costo asignado"}
            <br />
            <span className="text-xs text-muted-foreground/70">
              {withCost} de {totalProducts} con COGS
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
