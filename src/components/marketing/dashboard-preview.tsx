import { ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const bars = [40, 65, 50, 80, 60, 95, 72];

const rows = [
  { name: "Zapatillas urbanas - Talla 40", margin: "34%", status: "Saludable" },
  { name: "Set organizador de cocina x6", margin: "12%", status: "Riesgo" },
  { name: "Audífonos inalámbricos Pro", margin: "41%", status: "Saludable" },
];

export function DashboardPreview() {
  return (
    <div className="relative rounded-2xl border border-border bg-card/70 p-2 shadow-2xl backdrop-blur-xl">
      <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-secondary/30 blur-2xl" />

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            Panel de rentabilidad
          </p>
          <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-500">
            <TrendingUp className="h-3 w-3" />
            +18% este mes
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span className="text-xs">Ganancia neta</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">$14,280,300</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-xs">Margen promedio</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">28.4%</p>
          </div>
        </div>

        <div className="mt-4 flex h-24 items-end gap-2 rounded-lg border border-border/60 bg-muted/20 p-4">
          {bars.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-primary to-secondary"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <span className="truncate pr-2 text-foreground/90">{row.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{row.margin}</span>
                <Badge
                  variant={row.status === "Riesgo" ? "destructive" : "secondary"}
                  className={
                    row.status === "Saludable"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : undefined
                  }
                >
                  {row.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
