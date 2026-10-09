"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Package,
  PackageX,
  TimerReset,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { cn } from "@/lib/utils";

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
};

type Status = "sin-stock" | "critico" | "bajo" | "sano";

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  "sin-stock": { label: "Sin stock", color: "text-destructive bg-danger-bg", dot: "bg-destructive" },
  critico: { label: "Crítico", color: "text-destructive bg-danger-bg", dot: "bg-destructive" },
  bajo: { label: "Bajo", color: "text-warning bg-warning-bg", dot: "bg-warning" },
  sano: { label: "Sano", color: "text-success bg-success-bg", dot: "bg-success" },
};

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
  if (days < 30) return "bajo";
  return "sano";
}

function formatMoney(value: number, currencyId: string) {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyId,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString()}`;
  }
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
  const sinStock = enriched.filter((p) => p.status === "sin-stock").length;
  const criticos = enriched.filter((p) => p.status === "critico").length;

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
        const rank = (p: typeof a) => (p.status === "sin-stock" ? -1 : p.days ?? Infinity);
        return rank(a) - rank(b);
      });
  }, [enriched, search, filter]);

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Exclusivo de MeliBoost:</span> los días de stock restante
        se calculan con tu velocidad de venta real de los últimos 30 días — no es una estimación genérica.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Valor de Inventario"
          value={formatMoney(totalStockValue, currencyId)}
          hint="costo (COGS) × stock actual"
          icon={Wallet}
          tone="primary"
        />
        <KpiCard
          label="Unidades en Stock"
          value={totalUnits.toLocaleString()}
          hint={`${products.length} publicaciones`}
          icon={Boxes}
          tone="secondary"
        />
        <KpiCard
          label="Sin Stock"
          value={sinStock}
          hint="publicaciones agotadas"
          icon={PackageX}
          tone="danger"
        />
        <KpiCard
          label="Quiebre Próximo"
          value={criticos}
          hint="se acaban en menos de 7 días"
          icon={TimerReset}
          tone="warning"
        />
      </div>

      {(sinStock > 0 || criticos > 0) && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--banner-warning-border)] bg-[var(--banner-warning-bg)] p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">
              {sinStock + criticos} publicaci{sinStock + criticos === 1 ? "ón necesita" : "ones necesitan"} atención
            </span>{" "}
            — {sinStock > 0 && <>{sinStock} sin stock</>}
            {sinStock > 0 && criticos > 0 && " y "}
            {criticos > 0 && <>{criticos} se agotan en menos de una semana</>}.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o ID..."
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "todos" as const, label: "Todos", count: enriched.length },
              { key: "sin-stock" as const, label: "Sin stock", count: sinStock },
              { key: "critico" as const, label: "Crítico", count: criticos },
              { key: "bajo" as const, label: "Bajo", count: enriched.filter((p) => p.status === "bajo").length },
              { key: "sano" as const, label: "Sano", count: enriched.filter((p) => p.status === "sano").length },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === option.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2 text-right">Ventas (30d)</th>
              <th className="px-3 py-2 text-right">Días restantes</th>
              <th className="px-3 py-2 text-right">Valor Inmovilizado</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const meta = STATUS_META[product.status];
              return (
                <tr key={product.productId} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={product.permalink}
                      target="_blank"
                      className="flex items-center gap-2 hover:underline"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                        {product.thumbnail ? (
                          <Image src={product.thumbnail} alt="" width={32} height={32} className="object-cover" unoptimized />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="max-w-[260px] truncate">{product.title}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{product.availableQuantity}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{product.unitsSold30d}</td>
                  <td className="px-3 py-2 text-right">
                    {product.status === "sin-stock" ? (
                      <span className="text-destructive">—</span>
                    ) : product.days === null ? (
                      <span className="text-xs text-muted-foreground">Sin ventas recientes</span>
                    ) : (
                      <span className={cn(product.days < 30 && "text-warning")}>{Math.floor(product.days)} días</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatMoney(product.stockValue, currencyId)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="outline" className={cn("gap-1.5 border-transparent", meta.color)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
