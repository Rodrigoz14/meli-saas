"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown, Flame, Lightbulb, Search, TriangleAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { computePeriodProfit, diagnose } from "@/lib/profitability";

export type ProfitabilityRow = {
  productId: string;
  meliItemId: string | null;
  title: string;
  thumbnail: string;
  permalink: string;
  price: number;
  currencyId: string;
  availableQuantity: number;
  saleFee: number;
  cogs: number;
  unitsSold30d: number;
  revenue30d: number;
  commission30d: number;
  shipping30d: number;
};

type SortKey =
  | "units"
  | "revenue"
  | "price"
  | "commission"
  | "shipping"
  | "netProfit"
  | "margin";

const SORT_LABELS: Record<SortKey, string> = {
  units: "unidades vendidas",
  revenue: "ingresos",
  price: "precio",
  commission: "comisión",
  shipping: "envío",
  netProfit: "margen $",
  margin: "margen %",
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

function Row({
  row,
  taxWithholdingPercent,
}: {
  row: ProfitabilityRow;
  taxWithholdingPercent: number;
}) {
  const {
    netProfit: totalProfit,
    margin,
    retention,
  } = computePeriodProfit({
    price: row.price,
    saleFee: row.saleFee,
    cogs: row.cogs,
    unitsSold: row.unitsSold30d,
    revenue: row.revenue30d,
    commission: row.commission30d,
    shipping: row.shipping30d,
    taxWithholdingPercent,
  });
  const diagnosis = diagnose(margin, row.cogs > 0);

  return (
    <TableRow>
      <TableCell>
        <a
          href={row.permalink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 hover:underline"
        >
          <Image
            src={row.thumbnail}
            alt=""
            width={40}
            height={40}
            className="rounded-md border border-border object-cover"
            unoptimized
          />
          <span className="max-w-[220px] truncate text-sm font-medium">{row.title}</span>
        </a>
      </TableCell>
      <TableCell className="text-center">{row.unitsSold30d}</TableCell>
      <TableCell>{formatMoney(row.revenue30d, row.currencyId)}</TableCell>
      <TableCell>{formatMoney(row.price, row.currencyId)}</TableCell>
      <TableCell>
        {row.cogs > 0 ? (
          formatMoney(row.cogs, row.currencyId)
        ) : (
          <Link
            href="/dashboard/costos-gastos"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20"
          >
            Ingresar
          </Link>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        -{formatMoney(row.commission30d || row.saleFee, row.currencyId)}
      </TableCell>
      <TableCell className="text-cyan-600 dark:text-cyan-400">
        -{formatMoney(row.shipping30d, row.currencyId)}
      </TableCell>
      <TableCell className="text-amber-600 dark:text-amber-400">
        -{formatMoney(retention, row.currencyId)}
      </TableCell>
      <TableCell className="font-semibold">
        {formatMoney(totalProfit, row.currencyId)}
      </TableCell>
      <TableCell>
        <Badge
          variant={margin >= 15 ? "secondary" : "destructive"}
          className={margin >= 15 ? "bg-emerald-500/15 text-emerald-500" : undefined}
        >
          {margin.toFixed(1)}%
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
        {diagnosis}
      </TableCell>
    </TableRow>
  );
}

type FilterTab = "todos" | "killers" | "criticos" | "oportunidades";

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof Flame }[] = [
  { key: "todos", label: "Todos", icon: ArrowUpDown },
  { key: "killers", label: "Top Killers", icon: Flame },
  { key: "criticos", label: "Críticos", icon: TriangleAlert },
  { key: "oportunidades", label: "Oportunidades", icon: Lightbulb },
];

export function ProfitabilityTable({
  rows,
  taxWithholdingPercent,
}: {
  rows: ProfitabilityRow[];
  taxWithholdingPercent: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("units");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [search, setSearch] = useState("");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const withMetrics = useMemo(() => {
    return rows.map((row) => {
      const { netProfit, margin } = computePeriodProfit({
        price: row.price,
        saleFee: row.saleFee,
        cogs: row.cogs,
        unitsSold: row.unitsSold30d,
        revenue: row.revenue30d,
        commission: row.commission30d,
        shipping: row.shipping30d,
        taxWithholdingPercent,
      });
      return { row, netProfit, margin };
    });
  }, [rows, taxWithholdingPercent]);

  const tabCounts = useMemo(
    () => ({
      todos: withMetrics.length,
      killers: withMetrics.filter((e) => e.margin >= 30).length,
      criticos: withMetrics.filter((e) => e.margin < 15).length,
      oportunidades: withMetrics.filter((e) => e.row.cogs <= 0).length,
    }),
    [withMetrics],
  );

  // Totales del portafolio completo — se mantienen fijos sin importar el
  // filtro/búsqueda activos, igual que la fila "Totales" de Selltrix.
  const totals = useMemo(() => {
    return withMetrics.reduce(
      (acc, { row, netProfit }) => ({
        units: acc.units + row.unitsSold30d,
        revenue: acc.revenue + row.revenue30d,
        cogs: acc.cogs + row.cogs * row.unitsSold30d,
        commission: acc.commission + (row.commission30d || row.saleFee),
        shipping: acc.shipping + row.shipping30d,
        netProfit: acc.netProfit + netProfit,
      }),
      { units: 0, revenue: 0, cogs: 0, commission: 0, shipping: 0, netProfit: 0 },
    );
  }, [withMetrics]);
  const totalMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;
  const currencyId = rows[0]?.currencyId ?? "COP";

  const sortedRows = useMemo(() => {
    const filtered = withMetrics.filter((entry) => {
      if (filterTab === "killers" && entry.margin < 30) return false;
      if (filterTab === "criticos" && entry.margin >= 15) return false;
      if (filterTab === "oportunidades" && entry.row.cogs > 0) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = entry.row.title.toLowerCase().includes(q);
        const matchesId = (entry.row.meliItemId ?? "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesId) return false;
      }
      return true;
    });

    const valueOf = (entry: (typeof withMetrics)[number]) => {
      switch (sortKey) {
        case "units":
          return entry.row.unitsSold30d;
        case "revenue":
          return entry.row.revenue30d;
        case "price":
          return entry.row.price;
        case "commission":
          return entry.row.commission30d || entry.row.saleFee;
        case "shipping":
          return entry.row.shipping30d;
        case "netProfit":
          return entry.netProfit;
        case "margin":
          return entry.margin;
      }
    };

    return [...filtered].sort((a, b) => {
      const diff = valueOf(a) - valueOf(b);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [withMetrics, sortKey, sortDir, filterTab, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ID..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Publicación</TableHead>
            <SortableHead
              label="Uds (30d)"
              sortKey="units"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              className="text-center"
            />
            <SortableHead
              label="Ingresos (30d)"
              sortKey="revenue"
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
            <TableHead title="Se edita en la sección Costos y gastos">Costo producto</TableHead>
            <SortableHead
              label="Comisión ML"
              sortKey="commission"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHead
              label="Envío"
              sortKey="shipping"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <TableHead>Retenc.</TableHead>
            <SortableHead
              label="Margen $ (30d)"
              sortKey="netProfit"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHead
              label="Margen %"
              sortKey="margin"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <TableHead>Diagnóstico</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map(({ row }) => (
            <Row key={row.productId} row={row} taxWithholdingPercent={taxWithholdingPercent} />
          ))}
          {sortedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                Sin resultados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Totales ({withMetrics.length} productos)</TableCell>
            <TableCell className="text-center font-semibold">{totals.units}</TableCell>
            <TableCell className="font-semibold">{formatMoney(totals.revenue, currencyId)}</TableCell>
            <TableCell>—</TableCell>
            <TableCell className="font-semibold text-muted-foreground">
              -{formatMoney(totals.commission, currencyId)}
            </TableCell>
            <TableCell className="font-semibold text-cyan-600 dark:text-cyan-400">
              -{formatMoney(totals.shipping, currencyId)}
            </TableCell>
            <TableCell>—</TableCell>
            <TableCell className="font-semibold">{formatMoney(totals.netProfit, currencyId)}</TableCell>
            <TableCell className="font-semibold">{totalMargin.toFixed(1)}%</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Margen = Ingresos − Costo producto − Comisión − Envío − Retenciones.
      </p>
    </div>
  );
}
