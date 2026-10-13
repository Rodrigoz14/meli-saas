"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/format-money";

export type InventoryProduct = {
  productId: string;
  meliItemId: string | null;
  title: string;
  thumbnail: string;
  permalink: string;
  availableQuantity: number;
  unitsSold30d: number;
  cogs: number;
  price: number;
  logisticType?: string | null;
};

type Status = "sin-stock" | "critico" | "bajo" | "sano" | "sobrestock";

const STATUS_META: Record<Status, { label: string; badge: string; bar: string }> = {
  "sin-stock": { label: "Sin stock", badge: "bg-danger-bg text-destructive", bar: "bg-destructive" },
  critico: { label: "Crítico", badge: "bg-danger-bg text-destructive", bar: "bg-destructive" },
  bajo: { label: "Bajo", badge: "bg-warning-bg text-warning", bar: "bg-warning" },
  sano: { label: "Saludable", badge: "bg-success-bg text-success", bar: "bg-success" },
  sobrestock: { label: "Sobrestock", badge: "bg-info-bg text-info", bar: "bg-info" },
};

// Umbrales del diseño: 0 = Sin stock · <7d = Crítico · <15d = Bajo ·
// >90d = Sobrestock · resto = Saludable.
const MAX_BAR_DAYS = 60;

function daysOfStock(product: InventoryProduct): number | null {
  if (product.unitsSold30d <= 0) return null;
  const dailyVelocity = product.unitsSold30d / 30;
  return product.availableQuantity / dailyVelocity;
}

function statusOf(product: InventoryProduct): Status {
  if (product.availableQuantity <= 0) return "sin-stock";
  const days = daysOfStock(product);
  if (days === null) return "sano";
  if (days < 7) return "critico";
  if (days < 15) return "bajo";
  if (days > 90) return "sobrestock";
  return "sano";
}

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-[3px] hover:border-line-hi hover:shadow-[0_18px_36px_-20px_var(--glow)]">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export function InventorySection({
  products,
  currencyId,
}: {
  products: InventoryProduct[];
  currencyId: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | Status>("todos");

  const enriched = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        days: daysOfStock(p),
        status: statusOf(p),
        stockValue: p.cogs * p.availableQuantity,
      })),
    [products],
  );

  const totalStockValue = enriched.reduce((sum, p) => sum + p.stockValue, 0);
  const totalUnits = enriched.reduce((sum, p) => sum + p.availableQuantity, 0);
  const counts = {
    todos: enriched.length,
    "sin-stock": enriched.filter((p) => p.status === "sin-stock").length,
    critico: enriched.filter((p) => p.status === "critico").length,
    bajo: enriched.filter((p) => p.status === "bajo").length,
    sano: enriched.filter((p) => p.status === "sano").length,
    sobrestock: enriched.filter((p) => p.status === "sobrestock").length,
  };
  const inFull = enriched.filter((p) => p.logisticType === "fulfillment").length;

  const filtered = useMemo(() => {
    return enriched
      .filter((p) => {
        if (filter !== "todos" && p.status !== filter) return false;
        if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.meliItemId ?? "").includes(search)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Más urgente primero: sin stock > días restantes ascendente > sin
        // datos de venta (sano indefinido) al final.
        const rank = (p: typeof a) => (p.status === "sin-stock" ? -1 : (p.days ?? Infinity));
        return rank(a) - rank(b);
      });
  }, [enriched, search, filter]);

  const FILTERS: { key: "todos" | Status; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: counts.todos },
    { key: "sin-stock", label: "Sin stock", count: counts["sin-stock"] },
    { key: "critico", label: "Crítico", count: counts.critico },
    { key: "bajo", label: "Bajo", count: counts.bajo },
    { key: "sano", label: "Saludable", count: counts.sano },
    { key: "sobrestock", label: "Sobrestock", count: counts.sobrestock },
  ];

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Kpi
          label="Unidades en stock"
          value={formatNumber(totalUnits)}
          note={inFull > 0 ? `${inFull} publicaciones en FULL` : `${products.length} publicaciones`}
        />
        <Kpi
          label="Valor inmovilizado"
          value={formatMoney(totalStockValue, currencyId)}
          note="stock × costo de producto"
        />
        <Kpi
          label="Sin stock"
          value={formatNumber(counts["sin-stock"])}
          note="ventas perdidas hoy"
          tone="danger"
        />
        <Kpi
          label="Stock para < 7 días"
          value={formatNumber(counts.critico)}
          note="reabastece ya"
          tone="warning"
        />
      </div>

      {(counts["sin-stock"] > 0 || counts.critico > 0) && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--banner-warning-border)] bg-[var(--banner-warning-bg)] p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">
              {counts["sin-stock"] + counts.critico}{" "}
              {counts["sin-stock"] + counts.critico === 1 ? "publicación necesita" : "publicaciones necesitan"} atención
            </span>{" "}
            — {counts["sin-stock"] > 0 && <>{counts["sin-stock"]} sin stock</>}
            {counts["sin-stock"] > 0 && counts.critico > 0 && " y "}
            {counts.critico > 0 && <>{counts.critico} se agotan en menos de una semana</>}.
          </p>
        </div>
      )}

      <div className="rounded-[22px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  filter === option.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label} · {option.count}
              </button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ID…"
            className="h-9 w-[260px]"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                <th className="px-3 py-2.5">Producto</th>
                <th className="px-3 py-2.5">Ubicación</th>
                <th className="px-3 py-2.5 text-right">Stock</th>
                <th className="px-3 py-2.5 text-right">Ventas 30d</th>
                <th className="px-3 py-2.5">Días restantes</th>
                <th className="px-3 py-2.5 text-right">Valor inmovilizado</th>
                <th className="px-3 py-2.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const meta = STATUS_META[product.status];
                const barPct =
                  product.days === null ? 0 : Math.min((product.days / MAX_BAR_DAYS) * 100, 100);
                return (
                  <tr key={product.productId} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted">
                    <td className="px-3 py-3">
                      <Link href={product.permalink} target="_blank" className="flex items-center gap-2.5 hover:underline">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                          {product.thumbnail ? (
                            <Image src={product.thumbnail} alt="" width={36} height={36} className="object-cover" unoptimized />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[260px] truncate font-semibold">{product.title}</span>
                          {product.meliItemId ? (
                            <span className="block font-mono text-[11px] text-muted-foreground">{product.meliItemId}</span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {product.logisticType ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-bold",
                            product.logisticType === "fulfillment"
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {product.logisticType === "fulfillment" ? "FULL" : "Bodega"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{product.availableQuantity}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{product.unitsSold30d}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-track">
                          <span
                            className={cn("block h-full rounded-full", meta.bar)}
                            style={{ width: `${barPct}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-right text-xs tabular-nums">
                          {product.days === null ? "Sin ventas" : `${Math.floor(product.days)} días`}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                      {product.stockValue > 0 ? formatMoney(product.stockValue, currencyId) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", meta.badge)}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
