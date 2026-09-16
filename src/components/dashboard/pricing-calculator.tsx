"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Calculator, Info, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculatePricing, type PricingCalcInput, type PricingCalcResult } from "@/app/dashboard/actions";
import type { CostProduct } from "@/components/dashboard/costs-expenses";
import type { TaxEntryItem } from "@/components/dashboard/costs-expenses";

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

const NO_PRODUCT = "__none__";

export function PricingCalculator({
  products,
  currencyId,
  siteId,
  taxEntries,
}: {
  products: CostProduct[];
  currencyId: string;
  siteId: string;
  taxEntries: TaxEntryItem[];
}) {
  const defaultTaxPercent = useMemo(
    () => taxEntries.reduce((sum, t) => sum + t.percent, 0),
    [taxEntries],
  );

  const [mode, setMode] = useState<"costToPrice" | "priceToMargin">("costToPrice");
  const [productId, setProductId] = useState(NO_PRODUCT);
  const [cogs, setCogs] = useState("");
  const [price, setPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState("25");
  const [shippingCost, setShippingCost] = useState("0");
  const [adsPercent, setAdsPercent] = useState("0");
  const [taxPercent, setTaxPercent] = useState(String(defaultTaxPercent || 0));
  const [manualCommissionPercent, setManualCommissionPercent] = useState("13");
  const [result, setResult] = useState<PricingCalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.productId === productId) ?? null;

  function handleSelectProduct(id: string) {
    setProductId(id);
    setResult(null);
    const product = products.find((p) => p.productId === id);
    if (product) {
      if (product.cogs > 0) setCogs(String(product.cogs));
      setPrice(String(Math.round(product.price)));
    }
  }

  function handleCalculate() {
    setError(null);
    const cogsValue = Number(cogs);
    if (!Number.isFinite(cogsValue) || cogsValue < 0) {
      setError("Ingresa un costo de producto (COGS) válido");
      return;
    }

    const input: PricingCalcInput = {
      mode,
      cogs: cogsValue,
      shippingCost: Number(shippingCost) || 0,
      adsPercent: Number(adsPercent) || 0,
      taxPercent: Number(taxPercent) || 0,
      siteId: selectedProduct ? siteId : null,
      categoryId: selectedProduct ? selectedProduct.categoryId : null,
      listingTypeId: selectedProduct ? selectedProduct.listingTypeId : null,
      manualCommissionPercent: Number(manualCommissionPercent) || 0,
    };
    if (mode === "costToPrice") {
      input.targetMarginPercent = Number(targetMargin) || 0;
    } else {
      input.price = Number(price) || 0;
      if (input.price <= 0) {
        setError("Ingresa un precio de venta válido");
        return;
      }
    }

    startTransition(async () => {
      const res = await calculatePricing(input);
      if ("error" in res) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Exclusivo de MeliBoost:</span> elegí un producto real de tu
        cuenta y la comisión se calcula con la API oficial de Mercado Libre para esa categoría exacta — no es un
        porcentaje estimado.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex rounded-lg border border-border bg-muted/30 p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("costToPrice");
                setResult(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-2 font-medium transition-all",
                mode === "costToPrice" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Costo → Precio
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("priceToMargin");
                setResult(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-2 font-medium transition-all",
                mode === "priceToMargin" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Precio → Margen
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Producto (opcional — usa comisión real de ML)</Label>
            <select
              value={productId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value={NO_PRODUCT}>Sin producto — comisión manual</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.title}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                  {selectedProduct.thumbnail ? (
                    <Image src={selectedProduct.thumbnail} alt="" width={32} height={32} className="object-cover" unoptimized />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> Comisión real de ML para esta categoría
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Costo de producto (COGS)</Label>
              <Input type="number" value={cogs} onChange={(e) => setCogs(e.target.value)} placeholder="0" />
            </div>
            {mode === "costToPrice" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Margen deseado (%)</Label>
                <Input type="number" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} placeholder="25" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Precio de venta</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Costo de envío</Label>
              <Input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Inversión en Ads (%)</Label>
              <Input type="number" value={adsPercent} onChange={(e) => setAdsPercent(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Retenciones / Impuestos (%)</Label>
              <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} placeholder="0" />
            </div>
            {!selectedProduct && (
              <div className="space-y-1.5">
                <Label className="text-xs">Comisión ML estimada (%)</Label>
                <Input
                  type="number"
                  value={manualCommissionPercent}
                  onChange={(e) => setManualCommissionPercent(e.target.value)}
                  placeholder="13"
                />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button onClick={handleCalculate} disabled={isPending} className="w-full">
            <Calculator className="mr-2 h-4 w-4" />
            {isPending ? "Calculando…" : "Calcular"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!result ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6 text-muted-foreground/50" />
              <p>Completá los datos y calculá para ver el desglose.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {mode === "costToPrice" ? "Precio de venta sugerido" : "Precio evaluado"}
                  </p>
                  <p className="font-display text-3xl font-bold tracking-tight">
                    {formatMoney(result.price, currencyId)}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    result.commissionIsReal
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {result.commissionIsReal ? (
                    <>
                      <BadgeCheck className="h-3.5 w-3.5" /> Comisión real
                    </>
                  ) : (
                    <>
                      <Info className="h-3.5 w-3.5" /> Comisión estimada
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Utilidad Neta / unidad
                  </span>
                  <span className="font-display text-xl font-bold text-emerald-500">
                    {formatMoney(result.netProfit, currencyId)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Margen Neto</span>
                  <span className="text-sm font-bold text-emerald-500">{result.marginPercent.toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {[
                  { label: "Comisión Mercado Libre", value: result.commissionAmount, sub: `${result.commissionPercent.toFixed(1)}%`, color: "text-orange-500" },
                  { label: "Costo de envío", value: result.shippingCost, color: "text-cyan-500" },
                  { label: "Inversión en Ads", value: result.adsAmount, color: "text-violet-500" },
                  { label: "Retenciones / Impuestos", value: result.taxAmount, color: "text-amber-500" },
                  { label: "Costo de producto (COGS)", value: result.cogs, color: "text-rose-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={item.color}>
                      -{formatMoney(item.value, currencyId)}
                      {item.sub && <span className="ml-1 text-xs text-muted-foreground/70">({item.sub})</span>}
                    </span>
                  </div>
                ))}
              </div>

              {mode === "costToPrice" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  Precio calculado por aproximación sucesiva contra la comisión real de ML — puede variar unos
                  pesos del margen exacto pedido.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
