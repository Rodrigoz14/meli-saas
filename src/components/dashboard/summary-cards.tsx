import Link from "next/link";
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
    <div className="grid gap-4 md:grid-cols-3">
      <div className="group rounded-2xl border border-border bg-card p-6 shadow-[0_18px_36px_-20px_var(--glow-secondary)] transition-all duration-300 hover:-translate-y-[3px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">Margen de Contribución Total</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Disponible para gastos operativos (últimos 30 días)
        </p>
        <p className="mt-3 font-display text-3xl font-bold tracking-tight text-success">
          {formatMoney(totalNetProfit, currencyId)}
        </p>
      </div>

      <div className="group rounded-2xl border border-border bg-card p-6 shadow-[0_18px_36px_-20px_var(--glow)] transition-all duration-300 hover:-translate-y-[3px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PieChart className="h-4 w-4" />
          <span className="text-sm font-medium">Salud del Portafolio</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">Distribución por rentabilidad</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-success-bg p-3">
            <p className="text-2xl font-bold text-success">{killers}</p>
            <p className="text-[11px] text-muted-foreground uppercase">Killers ≥30%</p>
          </div>
          <div className="rounded-lg bg-warning-bg p-3">
            <p className="text-2xl font-bold text-warning">{regulares}</p>
            <p className="text-[11px] text-muted-foreground uppercase">Regulares 15-29%</p>
          </div>
          <div className="rounded-lg bg-danger-bg p-3">
            <p className="text-2xl font-bold text-destructive">{criticos}</p>
            <p className="text-[11px] text-muted-foreground uppercase">Críticos &lt;15%</p>
          </div>
        </div>
      </div>

      <div className="group rounded-2xl border border-border bg-card p-6 shadow-[0_18px_36px_-20px_rgba(229,154,11,0.35)] transition-all duration-300 hover:-translate-y-[3px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Completitud de Costos</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/70">Integridad de datos de COGS</p>
        <div className="mt-3 flex items-center gap-4">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${
                completeness === 100 ? "var(--success)" : "var(--warning)"
              } ${completeness}%, var(--track) ${completeness}%)`,
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card">
              <span
                className={cn("text-sm font-bold", completeness === 100 ? "text-success" : "text-warning")}
              >
                {completeness}%
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {missing > 0
              ? `Faltan ${missing} producto${missing === 1 ? "" : "s"} sin costo asignado`
              : "Todos tus productos tienen costo asignado"}
            <br />
            <span className="text-xs text-muted-foreground/70">
              {withCost} de {totalProducts} con COGS
            </span>
            {missing > 0 ? (
              <>
                {" · "}
                <Link href="/dashboard/costos-gastos?tab=cogs" className="text-xs text-primary hover:underline">
                  Asignar COGS →
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
