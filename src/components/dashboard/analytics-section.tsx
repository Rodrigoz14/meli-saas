"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Info,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AnalyticsData, ImpactBreakdown, ItemAnalytics, PeriodTotals } from "@/lib/analytics-data";

type ConnectedAnalyticsData = Extract<AnalyticsData, { connected: true }>;

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

function formatSigned(value: number, currencyId: string) {
  return `${value >= 0 ? "+" : "-"}${formatMoney(Math.abs(value), currencyId)}`;
}

function pctChange(now: number, prev: number) {
  if (prev === 0) return now > 0 ? 100 : 0;
  return ((now - prev) / prev) * 100;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildInsight(now: PeriodTotals, prev: PeriodTotals, impact: ImpactBreakdown, currencyId: string) {
  const deltaRevenue = now.revenue - prev.revenue;
  const factors = [
    { key: "Ticket Promedio", value: impact.avgTicket },
    { key: "Tasa de Conversión", value: impact.conversion },
    { key: "Tráfico (Visitas)", value: impact.visits },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const direction = deltaRevenue >= 0 ? "subieron" : "bajaron";
  const [main, secondary] = factors;

  let sentence = `Tus ingresos ${direction} ${formatMoney(Math.abs(deltaRevenue), currencyId)} principalmente por ${main.key} (${formatSigned(main.value, currencyId)}).`;

  if (secondary && Math.abs(secondary.value) > Math.abs(deltaRevenue) * 0.05) {
    const verb = Math.sign(secondary.value) !== Math.sign(deltaRevenue) ? "amortiguó parcialmente" : "también influyó";
    sentence += ` ${secondary.key} ${verb} (${formatSigned(secondary.value, currencyId)}).`;
  }
  return sentence;
}

function reasonTag(item: ItemAnalytics) {
  const deltaRevenue = item.revenueNow - item.revenuePrev;
  const visitsChangePct = pctChange(item.visitsNow, item.visitsPrev);
  const convNow = item.visitsNow > 0 ? item.unitsNow / item.visitsNow : 0;
  const convPrev = item.visitsPrev > 0 ? item.unitsPrev / item.visitsPrev : 0;
  const convChangePct = pctChange(convNow, convPrev);
  const visitsDominant = Math.abs(visitsChangePct) >= Math.abs(convChangePct);

  if (deltaRevenue < 0) {
    return visitsDominant ? "Caída por Tráfico" : "Caída por Conversión";
  }
  return visitsDominant ? "Impulso por Visibilidad" : "Mejora en Cierre de Ventas";
}

function KpiCard({
  label,
  value,
  prevValue,
  changePct,
  glowRgb,
}: {
  label: string;
  value: string;
  prevValue: string;
  changePct: number;
  glowRgb: string;
}) {
  const isPositive = changePct >= 0;
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 shadow-[0_0_18px_-14px_var(--glow)] transition-shadow hover:shadow-[0_0_24px_-8px_var(--glow)]"
      style={{ "--glow": glowRgb } as React.CSSProperties}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">ant: {prevValue}</span>
        <span className={cn("flex items-center gap-0.5 font-medium", isPositive ? "text-emerald-500" : "text-rose-500")}>
          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(changePct).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function ImpactBar({ label, value, maxAbs, currencyId }: { label: string; value: number; maxAbs: number; currencyId: string }) {
  const pct = maxAbs > 0 ? (Math.abs(value) / maxAbs) * 100 : 0;
  const isPositive = value >= 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
          {formatSigned(value, currencyId)}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-2 rounded-full", isPositive ? "bg-emerald-500" : "bg-rose-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MoverCard({ item, currencyId }: { item: ItemAnalytics; currencyId: string }) {
  const delta = item.revenueNow - item.revenuePrev;
  const isPositive = delta >= 0;
  return (
    <a
      href={item.permalink}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
        {item.thumbnail ? (
          <Image src={item.thumbnail} alt="" width={40} height={40} className="object-cover" unoptimized />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.meliItemId}</p>
        <span
          className={cn(
            "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px]",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
          )}
        >
          {reasonTag(item)}
        </span>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
        {formatSigned(delta, currencyId)}
      </span>
    </a>
  );
}

function OverviewTab({ data }: { data: ConnectedAnalyticsData }) {
  const { now, prev, impact, items, currencyId } = data;
  const maxAbsImpact = Math.max(Math.abs(impact.visits), Math.abs(impact.conversion), Math.abs(impact.avgTicket), 1);

  const movers = useMemo(() => {
    const withDelta = items
      .filter((i) => i.revenueNow > 0 || i.revenuePrev > 0)
      .map((i) => ({ item: i, delta: i.revenueNow - i.revenuePrev }))
      .sort((a, b) => a.delta - b.delta);
    return {
      caida: withDelta.slice(0, 3),
      crecimiento: withDelta.slice(-3).reverse(),
    };
  }, [items]);

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 shadow-[0_0_18px_-14px_rgba(245,158,11,0.7)] dark:text-amber-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold">Métricas Brutas</span> (igual que Mercado Libre). No descuenta
          cancelaciones. Para ver ingresos netos, usa el Dashboard principal.
        </span>
      </p>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm shadow-[0_0_20px_-14px_rgba(99,102,241,0.8)]">
        {buildInsight(now, prev, impact, currencyId)}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ingresos Brutos"
          value={formatMoney(now.revenue, currencyId)}
          prevValue={formatMoney(prev.revenue, currencyId)}
          changePct={pctChange(now.revenue, prev.revenue)}
          glowRgb="rgba(99,102,241,0.7)"
        />
        <KpiCard
          label="Cantidad de Ventas"
          value={String(now.units)}
          prevValue={String(prev.units)}
          changePct={pctChange(now.units, prev.units)}
          glowRgb="rgba(20,184,166,0.7)"
        />
        <KpiCard
          label="Visitas"
          value={now.visits.toLocaleString()}
          prevValue={prev.visits.toLocaleString()}
          changePct={pctChange(now.visits, prev.visits)}
          glowRgb="rgba(249,115,22,0.7)"
        />
        <KpiCard
          label="Conversión"
          value={`${(now.conversion * 100).toFixed(2)}%`}
          prevValue={`${(prev.conversion * 100).toFixed(2)}%`}
          changePct={pctChange(now.conversion, prev.conversion)}
          glowRgb="rgba(139,92,246,0.7)"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_0_20px_-16px_rgba(99,102,241,0.6)]">
        <p className="text-sm font-semibold">Impacto en ventas por variable</p>
        <div className="mt-4 space-y-4">
          <ImpactBar label="Ticket Promedio" value={impact.avgTicket} maxAbs={maxAbsImpact} currencyId={currencyId} />
          <ImpactBar label="Tasa de Conversión" value={impact.conversion} maxAbs={maxAbsImpact} currencyId={currencyId} />
          <ImpactBar label="Tráfico (Visitas)" value={impact.visits} maxAbs={maxAbsImpact} currencyId={currencyId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-rose-500/20 bg-card p-4 shadow-[0_0_20px_-14px_rgba(244,63,94,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(244,63,94,0.85)]">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-500">
            <TrendingDown className="h-4 w-4" /> Mayor caída
          </p>
          <div className="mt-3 space-y-2">
            {movers.caida.map(({ item }) => (
              <MoverCard key={item.productId} item={item} currencyId={currencyId} />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-card p-4 shadow-[0_0_20px_-14px_rgba(16,185,129,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(16,185,129,0.85)]">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
            <TrendingUp className="h-4 w-4" /> Mayor crecimiento
          </p>
          <div className="mt-3 space-y-2">
            {movers.crecimiento.map(({ item }) => (
              <MoverCard key={item.productId} item={item} currencyId={currencyId} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Tier = "killer" | "potencial" | "cola";

function PublicacionesTab({ data }: { data: ConnectedAnalyticsData }) {
  const { items, currencyId, periodFrom, periodTo } = data;
  const [search, setSearch] = useState("");

  const classified = useMemo(() => {
    const totalRevenue = items.reduce((sum, i) => sum + i.revenueNow, 0);
    const sorted = [...items].sort((a, b) => b.revenueNow - a.revenueNow);
    const { rows } = sorted.reduce<{ cumulative: number; rows: { item: ItemAnalytics; pctOfTotal: number; tier: Tier; cvr: number }[] }>(
      (acc, item) => {
        const cumulative = acc.cumulative + item.revenueNow;
        const cumPct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 100;
        const pctOfTotal = totalRevenue > 0 ? (item.revenueNow / totalRevenue) * 100 : 0;
        const tier: Tier = cumPct <= 80 ? "killer" : cumPct <= 95 ? "potencial" : "cola";
        const cvr = item.visitsNow > 0 ? (item.unitsNow / item.visitsNow) * 100 : 0;
        acc.rows.push({ item, pctOfTotal, tier, cvr });
        return { cumulative, rows: acc.rows };
      },
      { cumulative: 0, rows: [] },
    );
    return rows;
  }, [items]);

  const tierTotals = useMemo(() => {
    const totalRevenue = items.reduce((sum, i) => sum + i.revenueNow, 0);
    const sums: Record<Tier, { count: number; revenue: number }> = {
      killer: { count: 0, revenue: 0 },
      potencial: { count: 0, revenue: 0 },
      cola: { count: 0, revenue: 0 },
    };
    for (const c of classified) {
      sums[c.tier].count += 1;
      sums[c.tier].revenue += c.item.revenueNow;
    }
    return {
      killer: { ...sums.killer, pct: totalRevenue > 0 ? (sums.killer.revenue / totalRevenue) * 100 : 0 },
      potencial: { ...sums.potencial, pct: totalRevenue > 0 ? (sums.potencial.revenue / totalRevenue) * 100 : 0 },
      cola: { ...sums.cola, pct: totalRevenue > 0 ? (sums.cola.revenue / totalRevenue) * 100 : 0 },
    };
  }, [classified, items]);

  const filtered = useMemo(() => {
    if (!search) return classified;
    const q = search.toLowerCase();
    return classified.filter(
      (c) => c.item.title.toLowerCase().includes(q) || c.item.meliItemId.toLowerCase().includes(q),
    );
  }, [classified, search]);

  function handleDownload() {
    const rows: (string | number)[][] = [
      ["Pareto", "Publicación", "ID", "Ingresos", "% del total", "Visitas", "Ventas", "CVR %"],
      ...classified.map((c) => [
        c.tier.toUpperCase(),
        c.item.title,
        c.item.meliItemId,
        c.item.revenueNow,
        c.pctOfTotal.toFixed(1),
        c.item.visitsNow,
        c.item.unitsNow,
        c.cvr.toFixed(2),
      ]),
    ];
    downloadCsv(`analytics-publicaciones-${formatDate(periodFrom)}-${formatDate(periodTo)}.csv`, rows);
  }

  const tierLabel: Record<Tier, string> = { killer: "KILLER", potencial: "POTENCIAL", cola: "COLA LARGA" };
  const tierClass: Record<Tier, string> = {
    killer: "bg-emerald-500/15 text-emerald-500",
    potencial: "bg-blue-500/15 text-blue-500",
    cola: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Período: {formatDate(periodFrom)} — {formatDate(periodTo)}
        </p>
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
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Descargar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center shadow-[0_0_20px_-14px_rgba(16,185,129,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(16,185,129,0.85)]">
          <p className="font-display text-2xl font-bold tracking-tight text-emerald-500">{tierTotals.killer.count}</p>
          <p className="text-xs text-muted-foreground">KILLER ({tierTotals.killer.pct.toFixed(0)}% ingresos)</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center shadow-[0_0_20px_-14px_rgba(59,130,246,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(59,130,246,0.85)]">
          <p className="font-display text-2xl font-bold tracking-tight text-blue-500">{tierTotals.potencial.count}</p>
          <p className="text-xs text-muted-foreground">POTENCIAL ({tierTotals.potencial.pct.toFixed(0)}%)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center shadow-[0_0_20px_-16px_rgba(148,163,184,0.6)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(148,163,184,0.75)]">
          <p className="font-display text-2xl font-bold tracking-tight">{tierTotals.cola.count}</p>
          <p className="text-xs text-muted-foreground">COLA LARGA ({tierTotals.cola.pct.toFixed(0)}%)</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Pareto</th>
              <th className="px-3 py-2">Publicación</th>
              <th className="px-3 py-2 text-right">Ingresos</th>
              <th className="px-3 py-2 text-right">%</th>
              <th className="px-3 py-2 text-right">Visitas</th>
              <th className="px-3 py-2 text-right">Ventas</th>
              <th className="px-3 py-2 text-right">CVR</th>
              <th className="px-3 py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ item, pctOfTotal, tier, cvr }) => (
              <tr key={item.productId} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tierClass[tier])}>
                    {tierLabel[tier]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt="" width={32} height={32} className="object-cover" unoptimized />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="max-w-[200px] truncate">{item.title}</span>
                  </a>
                </td>
                <td className="px-3 py-2 text-right font-medium">{formatMoney(item.revenueNow, currencyId)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{pctOfTotal.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{item.visitsNow.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{item.unitsNow}</td>
                <td className="px-3 py-2 text-right text-emerald-500">{cvr.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{item.availableQuantity}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
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

export function AnalyticsSection({ data, days }: { data: ConnectedAnalyticsData; days: number }) {
  const periodOptions = [7, 15, 30];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {periodOptions.map((option) => (
          <Link
            key={option}
            href={`/dashboard/analytics?days=${option}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
              days === option
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_16px_-4px_var(--primary)]"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option} días
          </Link>
        ))}
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Análisis General</TabsTrigger>
          <TabsTrigger value="publicaciones">Publicaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="publicaciones" className="mt-6">
          <PublicacionesTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
