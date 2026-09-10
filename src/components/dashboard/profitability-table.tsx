"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
      <TableCell className={row.cogs > 0 ? undefined : "text-muted-foreground"}>
        {row.cogs > 0 ? formatMoney(row.cogs, row.currencyId) : "Sin costo"}
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

export function ProfitabilityTable({
  rows,
  taxWithholdingPercent,
}: {
  rows: ProfitabilityRow[];
  taxWithholdingPercent: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("units");
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
    const withMetrics = rows.map((row) => {
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

    return [...withMetrics].sort((a, b) => {
      const diff = valueOf(a) - valueOf(b);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [rows, sortKey, sortDir, taxWithholdingPercent]);

  return (
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
        </TableBody>
      </Table>
    </div>
  );
}
