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
  "sin-stock": { label: "Sin stock", color: "text-rose-500 bg-rose-500/10", dot: "bg-rose-500" },
  critico: { label: "Crítico", color: "text-orange-500 bg-orange-500/10", dot: "bg-orange-500" },
  bajo: { label: "Bajo", color: "text-amber-500 bg-amber-500/10", dot: "bg-amber-500" },
  sano: { label: "Sano", color: "text-emerald-500 bg-emerald-500/10", dot: "bg-emerald-500" },
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-[0_0_20px_-12px_rgba(99,102,241,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(99,102,241,0.85)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-primary">Valor de Inventario</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-tight">
            {formatMoney(totalStockValue, currencyId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">costo (COGS) × stock actual</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-secondary/20 bg-secondary/5 p-6 shadow-[0_0_20px_-12px_rgba(20,184,166,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(20,184,166,0.85)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary transition-transform duration-300 group-hover:scale-110">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-secondary">Unidades en Stock</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-tight">{totalUnits.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{products.length} publicaciones</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-[0_0_20px_-12px_rgba(244,63,94,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(244,63,94,0.85)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 transition-transform duration-300 group-hover:scale-110">
              <PackageX className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-rose-500">Sin Stock</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-tight text-rose-500">{sinStock}</p>
          <p className="mt-1 text-xs text-muted-foreground">publicaciones agotadas</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 shadow-[0_0_20px_-12px_rgba(249,115,22,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-10px_rgba(249,115,22,0.85)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500 transition-transform duration-300 group-hover:scale-110">
              <TimerReset className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-orange-500">Quiebre Próximo</span>
          </div>
          <p className="mt-4 font-display text-2xl font-bold tracking-tight text-orange-500">{criticos}</p>
          <p className="mt-1 text-xs text-muted-foreground">se acaban en menos de 7 días</p>
        </div>
      </div>

      {(sinStock > 0 || criticos > 0) && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
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
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos ({enriched.length})</option>
          <option value="sin-stock">Sin stock ({sinStock})</option>
          <option value="critico">Crítico (&lt;7 días) ({criticos})</option>
          <option value="bajo">Bajo (&lt;30 días) ({enriched.filter((p) => p.status === "bajo").length})</option>
          <option value="sano">Sano ({enriched.filter((p) => p.status === "sano").length})</option>
        </select>
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
                      <span className="text-rose-500">—</span>
                    ) : product.days === null ? (
                      <span className="text-xs text-muted-foreground">Sin ventas recientes</span>
                    ) : (
                      <span className={cn(product.days < 7 && "text-orange-500", product.days < 30 && product.days >= 7 && "text-amber-500")}>
                        {Math.floor(product.days)} días
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatMoney(product.stockValue, currencyId)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", meta.color)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
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
