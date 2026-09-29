"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Package, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/dashboard/copy-button";
import { runSeoOptimizer, type SeoOptimizerResult } from "@/app/dashboard/actions";
import { savePublicationContext } from "@/lib/publication-context";
import type { PublicationProduct } from "@/lib/publications-shared";

const SCORE_STYLES: Record<"alta" | "media" | "baja", string> = {
  alta: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  media: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  baja: "border-border bg-muted text-muted-foreground",
};

const SCORE_LABELS: Record<"alta" | "media" | "baja", string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function SeoOptimizer({ products, siteId }: { products: PublicationProduct[]; siteId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [result, setResult] = useState<SeoOptimizerResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.productId === selectedId);

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    const product = products.find((p) => p.productId === id);
    setProductName(product?.title ?? "");
    setResult(null);
  }

  function handleGenerate() {
    if (!productName.trim()) {
      toast.error("Ingresá el nombre del producto");
      return;
    }
    startTransition(async () => {
      try {
        const data = await runSeoOptimizer({
          productName,
          brand: brand || undefined,
          categoryIdHint: selectedProduct?.categoryId || undefined,
          siteId,
        });
        setResult(data);
        savePublicationContext({
          productId: selectedId,
          productName,
          categoryId: data.categoryId ?? undefined,
          categoryName: data.categoryName ?? undefined,
          keywords: data.keywords,
          bestTitle: data.titles[0],
        });
        toast.success("Palabras clave y títulos generados");
      } catch {
        toast.error("No se pudo generar el resultado, intentá de nuevo");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Publicación real (opcional)</label>
          <select
            value={selectedId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Empezar desde cero —</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <a
            href={selectedProduct.permalink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
              {selectedProduct.thumbnail ? (
                <Image src={selectedProduct.thumbnail} alt="" width={48} height={48} className="object-cover" unoptimized />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span className="truncate text-sm text-muted-foreground">Ver publicación real →</span>
          </a>
        )}

        <div>
          <label className="text-sm font-medium">Nombre del producto</label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ej: audifonos inalambricos xiaomi"
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Marca (opcional)</label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Xiaomi" className="mt-1.5" />
        </div>

        <Button onClick={handleGenerate} disabled={isPending} className="w-full">
          <Search className="mr-2 h-4 w-4" />
          {isPending ? "Analizando…" : "Extraer Palabras Clave y Generar Títulos"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Busca la categoría real y las búsquedas más reales de Mercado Libre para tu producto — si Mercado Libre no
          responde, la IA completa lo que falte.
        </p>
      </div>

      <div className="space-y-4">
        {!result && !isPending && (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Las palabras clave y los títulos optimizados van a aparecer acá.
          </div>
        )}

        {isPending && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Consultando Mercado Libre y generando títulos…
          </div>
        )}

        {result && !isPending && (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                Tendencias reales de ML: {result.trendsCount}
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                Sinónimos IA: {result.aiSynonymsCount}
              </span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                Keywords útiles: {result.keywords.length}
              </span>
            </div>

            {result.keywords.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-medium">Keywords filtrados por IA ({result.keywords.length})</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Solo los que aplican a tu producto</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.keywords.map((k) => (
                    <span
                      key={k.term}
                      className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", SCORE_STYLES[k.score])}
                    >
                      {k.term} <span className="opacity-70">· {SCORE_LABELS[k.score]}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.titles.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-medium">Títulos optimizados</p>
                <div className="mt-3 space-y-2.5">
                  {result.titles.map((title, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className={cn("mt-0.5 text-xs", title.length > 60 ? "text-destructive" : "text-muted-foreground")}>
                          {title.length}/60 caracteres
                        </p>
                      </div>
                      <CopyButton text={title} />
                    </div>
                  ))}
                  {result.catalogTitle && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-primary">Catálogo</p>
                        <p className="mt-0.5 text-sm font-semibold">{result.catalogTitle}</p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            result.catalogTitle.length > 120 ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {result.catalogTitle.length}/120 caracteres
                        </p>
                      </div>
                      <CopyButton text={result.catalogTitle} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Categoría detectada:{" "}
              {result.categoryId ? (
                <span className="font-medium text-foreground">
                  {result.categoryName ? `${result.categoryName} (${result.categoryId})` : result.categoryId}
                </span>
              ) : (
                "no detectada"
              )}
              {result.categorySource === "producto-real" && " · desde tu publicación real"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
