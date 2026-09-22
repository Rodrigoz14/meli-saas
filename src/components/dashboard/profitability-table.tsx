"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Flame, Lightbulb, Search, TriangleAlert } from "lucide-react";
import * as XLSX from "xlsx";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { computePeriodProfit, diagnose } from "@/lib/profitability";
import type { AdsItemMetric } from "@/lib/meli-api";
import { InlineCogsInput } from "@/components/dashboard/inline-cogs-input";

export type ProfitabilityRow = {
  productId: string;
  meliItemId: string | null;
  title: string;
  thumbnail: string;
  permalink: string;
  price: number;
  // Precio antes del descuento activo, real de Mercado Libre — null si la
  // publicación no tiene ninguna oferta corriendo en este momento.
  originalPrice: number | null;
  currencyId: string;
  availableQuantity: number;
  saleFee: number;
  // Necesarios para pedir la comisión real de ML a un precio hipotético
  // (calculadora de precios) — no se muestran en la tabla.
  categoryId: string;
  listingTypeId: string;
  cogs: number;
  unitsSold30d: number;
  revenue30d: number;
  commission30d: number;
  shipping30d: number;
  // Real, de la API de Product Ads de ML (últimos 30d) — null si esta
  // publicación no tuvo inversión en Ads en el período.
  ads: AdsItemMetric | null;
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
  adsConnected,
  onCogsSaved,
}: {
  row: ProfitabilityRow;
  taxWithholdingPercent: number;
  adsConnected: boolean;
  onCogsSaved: (productId: string, cogs: number) => void;
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
      <TableCell>
        {row.originalPrice && row.originalPrice > row.price ? (
          <div className="flex flex-col">
            <span className="font-semibold text-emerald-500">{formatMoney(row.price, row.currencyId)}</span>
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(row.originalPrice, row.currencyId)}
            </span>
          </div>
        ) : (
          formatMoney(row.price, row.currencyId)
        )}
      </TableCell>
      <TableCell>
        <InlineCogsInput
          productId={row.productId}
          initialValue={row.cogs}
          currencyId={row.currencyId}
          onSaved={(cogs) => onCogsSaved(row.productId, cogs)}
        />
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
      {adsConnected && (
        <TableCell className="text-right">
          {row.ads ? (
            <div className="flex flex-col items-end">
              <span className="font-medium text-violet-500">
                {row.ads.clicks.toLocaleString()} clics / {formatMoney(row.ads.cost, row.currencyId)}
              </span>
              <span className="text-[10px] text-muted-foreground">{row.ads.ctr.toFixed(2)}%</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">Sin Ads</span>
          )}
        </TableCell>
      )}
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
  adsConnected,
  days,
}: {
  rows: ProfitabilityRow[];
  taxWithholdingPercent: number;
  adsConnected: boolean;
  days: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("units");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [search, setSearch] = useState("");
  const [prevRows, setPrevRows] = useState(rows);
  const [localRows, setLocalRows] = useState(rows);

  // Re-sincroniza el estado local (editado de forma optimista al guardar un
  // costo) cuando el servidor manda props nuevas de verdad — mismo patrón
  // que Costos y Gastos, sin useEffect.
  if (rows !== prevRows) {
    setPrevRows(rows);
    setLocalRows(rows);
  }

  function handleCogsSaved(productId: string, cogs: number) {
    setLocalRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, cogs } : r)));
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const withMetrics = useMemo(() => {
    return localRows.map((row) => {
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
  }, [localRows, taxWithholdingPercent]);

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
  const currencyId = localRows[0]?.currencyId ?? "COP";

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

  // Exporta exactamente lo que se ve en pantalla (filtro de tab + búsqueda +
  // orden actuales), igual que la fila "Totales" — no todo el catálogo sin
  // filtrar, para que lo que se descarga coincida con lo que el usuario está
  // mirando.
  function buildExportRows(): (string | number)[][] {
    const header = [
      "Publicación",
      "ID",
      `Uds (${days}d)`,
      `Ingresos (${days}d)`,
      "Precio",
      "Costo producto",
      "Comisión ML",
      "Envío",
      "Retención",
      `Margen $ (${days}d)`,
      "Margen %",
    ];
    if (adsConnected) header.push("Clics Ads", "CTR Ads %", "Costo Ads");
    header.push("Diagnóstico");

    return [
      header,
      ...sortedRows.map(({ row, netProfit, margin }) => {
        const { retention } = computePeriodProfit({
          price: row.price,
          saleFee: row.saleFee,
          cogs: row.cogs,
          unitsSold: row.unitsSold30d,
          revenue: row.revenue30d,
          commission: row.commission30d,
          shipping: row.shipping30d,
          taxWithholdingPercent,
        });
        const line: (string | number)[] = [
          row.title,
          row.meliItemId ?? "",
          row.unitsSold30d,
          row.revenue30d,
          row.price,
          row.cogs,
          row.commission30d || row.saleFee,
          row.shipping30d,
          retention,
          netProfit,
          Number(margin.toFixed(1)),
        ];
        if (adsConnected) {
          line.push(row.ads?.clicks ?? 0, Number((row.ads?.ctr ?? 0).toFixed(2)), row.ads?.cost ?? 0);
        }
        line.push(diagnose(margin, row.cogs > 0));
        return line;
      }),
    ];
  }

  function exportFilename(ext: string) {
    return `rentabilidad-${days}d-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  function handleExportCsv() {
    const rows = buildExportRows();
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename("csv");
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportXlsx() {
    const rows = buildExportRows();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rentabilidad");
    XLSX.writeFile(workbook, exportFilename("xlsx"));
  }

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
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ID..."
              className="pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>Descargar CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXlsx}>Descargar XLSX</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Publicación</TableHead>
            <SortableHead
              label={`Uds (${days}d)`}
              sortKey="units"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
              className="text-center"
            />
            <SortableHead
              label={`Ingresos (${days}d)`}
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
              label={`Margen $ (${days}d)`}
              sortKey="netProfit"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            {adsConnected && (
              <TableHead className="text-right" title={`Clics ÷ Impresiones de tus anuncios de Product Ads (últimos ${days} días)`}>
                CTR Ads ({days}d)
              </TableHead>
            )}
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
            <Row
              key={row.productId}
              row={row}
              taxWithholdingPercent={taxWithholdingPercent}
              adsConnected={adsConnected}
              onCogsSaved={handleCogsSaved}
            />
          ))}
          {sortedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={adsConnected ? 11 : 10} className="py-6 text-center text-muted-foreground">
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
            {adsConnected && <TableCell />}
            <TableCell className="font-semibold">{totalMargin.toFixed(1)}%</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Margen = Ingresos − Costo producto − Comisión − Envío − Retenciones.
        {adsConnected &&
          ` CTR Ads = Clics ÷ Impresiones de tus anuncios de Product Ads en los últimos ${days} días — qué tan atractivo es tu anuncio para quien lo ve, no tu tasa de venta.`}
      </p>
    </div>
  );
}
