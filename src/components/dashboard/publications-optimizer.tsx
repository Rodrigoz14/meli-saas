"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Check, Copy, Loader2, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateOptimizedCopy } from "@/app/dashboard/actions";
import type { PublicationCopy } from "@/lib/ai";

type Product = { productId: string; title: string; thumbnail: string; permalink: string };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function PublicationsOptimizer({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [result, setResult] = useState<PublicationCopy | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.productId === selectedId);

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    const product = products.find((p) => p.productId === id);
    setCurrentTitle(product?.title ?? "");
    setResult(null);
  }

  function handleGenerate() {
    if (!currentTitle.trim() && !keyFeatures.trim()) {
      toast.error("Ingresá al menos el título actual o las características del producto");
      return;
    }
    startTransition(async () => {
      try {
        const copy = await generateOptimizedCopy({ currentTitle, keyFeatures, brand, category });
        if (!copy) {
          toast.error("No se pudo generar el resultado, intentá de nuevo");
          return;
        }
        setResult(copy);
        toast.success("Título y descripción generados");
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
          <label className="text-sm font-medium">Título actual</label>
          <Input
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            placeholder="Ej: reloj inteligente para hombre y mujer"
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Marca (opcional)</label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Xiaomi" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">Categoría (opcional)</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Smartwatches"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Características clave</label>
          <textarea
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            placeholder="Ej: pantalla AMOLED 1.43'', batería 7 días, resistente al agua 5ATM, incluye 2 correas..."
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cuanto más detalle pongas, mejor la descripción — la IA no inventa características que no le pasaste.
          </p>
        </div>

        <Button onClick={handleGenerate} disabled={isPending} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {isPending ? "Generando…" : "Generar con IA"}
        </Button>
      </div>

      <div className="space-y-4">
        {!result && !isPending && (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            El título y la descripción optimizados van a aparecer acá.
          </div>
        )}

        {isPending && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Generando título y descripción…
          </div>
        )}

        {result && !isPending && (
          <>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-[0_0_20px_-14px_rgba(99,102,241,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(99,102,241,0.85)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">Título optimizado</p>
                <CopyButton text={result.title} />
              </div>
              <p className="mt-2 font-display text-lg font-bold tracking-tight">{result.title}</p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  result.title.length > 60 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {result.title.length}/60 caracteres
              </p>
              {result.titleReasoning && (
                <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  {result.titleReasoning}
                </p>
              )}
            </div>

            {currentTitle && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Título actual (referencia)</p>
                <p className="mt-1 text-sm text-muted-foreground line-through">{currentTitle}</p>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-[0_0_20px_-14px_rgba(16,185,129,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(16,185,129,0.85)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Descripción optimizada</p>
                <CopyButton text={result.description} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{result.description}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
