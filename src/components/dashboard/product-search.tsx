"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { generateMockNicheReport, type NicheReport } from "@/lib/niche-mock";

type SortKey = "title" | "price" | "visits" | "estimatedRevenue";

const SORT_LABELS: Record<SortKey, string> = {
  title: "publicación",
  price: "precio",
  visits: "visitas",
  estimatedRevenue: "facturación estimada",
};

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

function NicheResults({ report }: { report: NicheReport }) {
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
    const valueOf = (row: NicheReport["rows"][number]) => {
      switch (sortKey) {
        case "title":
          return row.title.toLowerCase();
        case "price":
          return row.price;
        case "visits":
          return row.visits;
        case "estimatedRevenue":
          return row.estimatedRevenue;
      }
    };

    return [...report.rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      const diff = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [report.rows, sortKey, sortDir]);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Visitas totales (30d)</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {report.totalVisits.toLocaleString("es")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Facturación estimada</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-500">
            {formatMoney(report.totalEstimatedRevenue, report.currencyId)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Publicaciones analizadas</p>
          <p className="mt-2 font-display text-3xl font-bold">{report.rows.length}</p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4",
          report.verdict === "aprobado"
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10",
        )}
      >
        <Badge
          className={
            report.verdict === "aprobado"
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-amber-500/15 text-amber-500"
          }
        >
          {report.verdict === "aprobado" ? "Nicho aprobado" : "Nicho con riesgo"}
        </Badge>
        <p className="mt-2 text-sm text-muted-foreground">{report.verdictText}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Publicación"
                sortKey="title"
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Precio"
                sortKey="price"
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead>Origen</TableHead>
              <SortableHead
                label="Visitas"
                sortKey="visits"
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
                className="text-center"
              />
              <SortableHead
                label="Fact. estimada"
                sortKey="estimatedRevenue"
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[280px] truncate text-sm font-medium">
                  {row.title}
                </TableCell>
                <TableCell>{formatMoney(row.price, report.currencyId)}</TableCell>
                <TableCell>
                  {row.isFull ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                      <Zap className="h-3.5 w-3.5" /> Full
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {row.visits.toLocaleString("es")}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatMoney(row.estimatedRevenue, report.currencyId)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<NicheReport | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setReport(generateMockNicheReport(query));
  }

  return (
    <div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        Datos de ejemplo (simulados) — todavía no hay una fuente de datos real
        conectada. Mercado Libre exige sesión logueada para ver resultados de
        búsqueda, así que traer esto en vivo requiere una extensión de
        navegador (como la que usa Selltrix), no solo el servidor.
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un nicho o producto, ej: maleta de viaje"
          className="max-w-md"
        />
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" />
          Analizar nicho
        </Button>
      </form>

      {report && <NicheResults report={report} />}
    </div>
  );
}
