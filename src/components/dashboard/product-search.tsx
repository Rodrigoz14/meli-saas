"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Package, Search, Zap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { generateMockNicheReport, type NicheReport, type NicheRow } from "@/lib/niche-mock";

type SortKey = "title" | "price" | "visits" | "estimatedRevenue" | "seller";

const SORT_LABELS: Record<SortKey, string> = {
  title: "publicación",
  price: "precio",
  visits: "visitas",
  estimatedRevenue: "facturación estimada",
  seller: "vendedor",
};

function money(value: number, currencyId: string) {
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

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (direction === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Ordenar por ${SORT_LABELS[sortKey]}`}
        className={cn(
          "flex items-center gap-1 hover:text-foreground",
          isActive && "font-semibold text-foreground",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

function KpiCard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-bold", valueClassName)}>{value}</p>
    </div>
  );
}

function VerdictBox({
  approved,
  title,
  text,
}: {
  approved: boolean;
  title: string;
  text: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        approved ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10",
      )}
    >
      <Badge className={approved ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}>
        {title}
      </Badge>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ProductsTable({ rows, currencyId }: { rows: NicheRow[]; currencyId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("visits");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedRows = useMemo(() => {
    const valueOf = (row: NicheRow) => {
      switch (sortKey) {
        case "title":
          return row.title.toLowerCase();
        case "seller":
          return row.seller.toLowerCase();
        case "price":
          return row.price;
        case "visits":
          return row.visits;
        case "estimatedRevenue":
          return row.estimatedRevenue;
      }
    };

    return [...rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      const diff = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Publicación" sortKey="title" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortableHead
              label="Visitas"
              sortKey="visits"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              className="text-center"
            />
            <SortableHead label="Precio" sortKey="price" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortableHead
              label="Fact. estimada"
              sortKey="estimatedRevenue"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <TableHead className="text-center">Catálogo</TableHead>
            <TableHead className="text-center">Full</TableHead>
            <TableHead className="text-center">Origen</TableHead>
            <SortableHead label="Vendedor" sortKey="seller" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-[240px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="truncate text-sm font-medium">{row.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">{row.visits.toLocaleString("es")}</TableCell>
              <TableCell>{money(row.price, currencyId)}</TableCell>
              <TableCell className="font-semibold">{money(row.estimatedRevenue, currencyId)}</TableCell>
              <TableCell className="text-center">
                {row.isCatalog ? (
                  <Badge className="bg-emerald-500/15 text-emerald-500">Catálogo</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {row.isFull ? (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                    <Zap className="h-3.5 w-3.5" /> Full
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No Full</span>
                )}
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{row.origin}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.seller}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DemandTab({ report }: { report: NicheReport }) {
  const d = report.demand;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Visitas 30 días globales" value={d.totalVisits.toLocaleString("es")} />
        <KpiCard label="Visitas promedio por pub" value={d.avgVisitsPerListing.toLocaleString("es")} />
        <KpiCard label="Ventas estimadas Global" value={d.estimatedSales.toLocaleString("es")} />
        <KpiCard
          label="Facturación estimada"
          value={money(d.estimatedRevenue, report.currencyId)}
          valueClassName="text-emerald-500"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">Análisis de Demanda</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs uppercase text-muted-foreground">Visitas prom.</p>
            <p className="mt-1 text-xl font-bold">{d.avgVisitsPerListing}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs uppercase text-muted-foreground">Pubs alta demanda</p>
            <p className="mt-1 text-xl font-bold">{d.highDemandListings}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs uppercase text-muted-foreground">Pubs alta fact.</p>
            <p className="mt-1 text-xl font-bold">{d.highRevenueListings}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs uppercase text-muted-foreground">% Top 3</p>
            <p className="mt-1 text-xl font-bold text-amber-500">{d.top3SharePercent}%</p>
          </div>
        </div>

        <p className="mt-6 text-sm font-semibold text-blue-500">Potencial de tráfico y facturación</p>
        <p className="mt-2 text-sm text-muted-foreground">{d.potentialText}</p>
      </div>

      <VerdictBox
        approved={d.verdict === "aprobado"}
        title={d.verdict === "aprobado" ? "Nicho aprobado" : "Nicho en riesgo"}
        text={d.verdictText}
      />

      <div>
        <p className="mb-3 text-sm font-semibold">Publicaciones ({report.rows.length})</p>
        <ProductsTable rows={report.rows} currencyId={report.currencyId} />
      </div>
    </div>
  );
}

function MarketTab({ report }: { report: NicheReport }) {
  const m = report.market;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Publicaciones" value={m.totalPublications.toLocaleString("es")} />
        <KpiCard label="% Full" value={`${m.fullPercent}%`} />
        <KpiCard label="% Catálogo" value={`${m.catalogPercent}%`} />
        <KpiCard label="% Internacionales" value={`${m.internationalPercent}%`} />
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Precio prom.</p>
          <p className="mt-2 font-display text-3xl font-bold">{money(m.avgPrice, report.currencyId)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rango: {money(m.minPrice, report.currencyId)} — {money(m.maxPrice, report.currencyId)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">Posesión del Mercado</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {m.marketShare.map((entry) => (
            <div key={entry.title}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-2 text-muted-foreground">{entry.title}</span>
                <span className="font-semibold">{entry.percent}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(entry.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">💡 Oportunidad: {m.opportunityText}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">Análisis de Mercado</p>
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Veredicto</p>
          <p className="mt-1 font-medium">🔥 {m.verdictText}</p>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Lectura del mercado</p>
        <p className="mt-1 text-sm text-muted-foreground">{m.readingText}</p>

        <p className="mt-6 text-xs font-semibold uppercase text-muted-foreground">Plan de acción</p>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <span className="font-medium text-foreground">Producto:</span>{" "}
            <span className="text-muted-foreground">{m.actionPlan.producto}</span>
          </li>
          <li>
            <span className="font-medium text-foreground">Logística:</span>{" "}
            <span className="text-muted-foreground">{m.actionPlan.logistica}</span>
          </li>
          <li>
            <span className="font-medium text-foreground">Precio:</span>{" "}
            <span className="text-muted-foreground">{m.actionPlan.precio}</span>
          </li>
          <li>
            <span className="font-medium text-foreground">Posicionamiento:</span>{" "}
            <span className="text-muted-foreground">{m.actionPlan.posicionamiento}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function StrategyTab({ report }: { report: NicheReport }) {
  const s = report.strategy;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <KpiCard label="Demanda" value={s.demandLabel} />
        <KpiCard label="Crecimiento" value={s.growthText} />
        <KpiCard label="Catálogos" value={s.catalogText} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">Análisis de Estrategia Inteligente</p>
        <p className="text-xs text-muted-foreground">Motor de Inteligencia Demanda + Mercado</p>
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Veredicto estratégico</p>
          <p className="mt-1 font-medium">🔥 {s.verdictText}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<NicheReport | null>(null);

  function runSearch(value: string) {
    if (!value.trim()) return;
    setQuery(value);
    setReport(generateMockNicheReport(value));
  }

  return (
    <div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        Datos de ejemplo (simulados) — todavía no hay una fuente de datos real
        conectada. Mercado Libre exige sesión logueada para ver resultados de
        búsqueda, así que traer esto en vivo requiere una extensión de
        navegador (como la que usa Selltrix), no solo el servidor.
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        <select
          defaultValue="CO"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="País"
        >
          <option value="CO">🇨🇴 Colombia</option>
          <option value="AR">🇦🇷 Argentina</option>
          <option value="MX">🇲🇽 México</option>
          <option value="BR">🇧🇷 Brasil</option>
          <option value="CL">🇨🇱 Chile</option>
          <option value="PE">🇵🇪 Perú</option>
        </select>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto o nicho (ej: auriculares bluetooth)"
          className="max-w-md flex-1"
        />
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" />
          Analizar
        </Button>
        <Badge variant="secondary" className="ml-auto">
          Búsquedas: ilimitado
        </Badge>
      </form>

      {report && report.relatedKeywords.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Search className="h-3.5 w-3.5" /> Búsquedas IA:
          </span>
          {report.relatedKeywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => runSearch(kw)}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {report && (
        <Tabs defaultValue="demanda" className="mt-6">
          <TabsList>
            <TabsTrigger value="demanda">Demanda</TabsTrigger>
            <TabsTrigger value="mercado">Mercado</TabsTrigger>
            <TabsTrigger value="estrategia">Estrategia</TabsTrigger>
          </TabsList>
          <TabsContent value="demanda" className="mt-6">
            <DemandTab report={report} />
          </TabsContent>
          <TabsContent value="mercado" className="mt-6">
            <MarketTab report={report} />
          </TabsContent>
          <TabsContent value="estrategia" className="mt-6">
            <StrategyTab report={report} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
