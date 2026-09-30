"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dashboard/copy-button";
import { ContextBanner } from "@/components/dashboard/context-banner";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { PublishToMeliButton } from "@/components/dashboard/publish-to-meli-button";
import { generateDescription, publishDescriptionToMeli } from "@/app/dashboard/actions";
import {
  clearLastImage,
  getLastImage,
  getLastPublicationContext,
  saveLastImage,
  savePublicationContext,
  type PublicationContext,
} from "@/lib/publication-context";
import type { PublicationProduct } from "@/lib/publications-shared";

// Antes esta herramienta generaba título + descripción juntos, inventando
// el título sin ningún dato real de búsqueda. Ahora el título "bueno" lo
// genera el Optimizador SEO (con keywords reales) — esta página se enfoca
// en la descripción y, si hay contexto reciente del Optimizador SEO,
// arranca precargada con ese título/categoría/keywords en vez de en blanco.
export function DescriptionGenerator({ products }: { products: PublicationProduct[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [includes, setIncludes] = useState("");
  const [warranty, setWarranty] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productThumbnailUrl, setProductThumbnailUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [context, setContext] = useState<PublicationContext | null>(null);
  const [useContext, setUseContext] = useState(true);

  useEffect(() => {
    const ctx = getLastPublicationContext();
    if (ctx) {
      setContext(ctx);
      setSelectedId(ctx.productId);
      setCurrentTitle(ctx.bestTitle ?? ctx.productName);
      setCategory(ctx.categoryName ?? "");
      setKeyFeatures(ctx.rawKeyFeatures || ctx.keywords.map((k) => k.term).join(", "));
    }
    // Si ya subiste o elegiste una foto en otra pestaña (SEO o Imágenes),
    // acá aparece precargada sola — no hace falta volver a subirla.
    const shared = getLastImage();
    if (shared) {
      if (shared.startsWith("data:")) setImageDataUrl(shared);
      else setProductThumbnailUrl(shared);
    }
  }, []);

  const selectedProduct = products.find((p) => p.productId === selectedId);

  const previewSrc = imageDataUrl || productThumbnailUrl;

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    const product = products.find((p) => p.productId === id);
    setCurrentTitle(product?.title ?? "");
    setProductThumbnailUrl(product?.thumbnail || null);
    setImageDataUrl(null);
    setDescription(null);
    if (product?.thumbnail) saveLastImage(product.thumbnail);
  }

  function handleImageChange(dataUrl: string | null) {
    setImageDataUrl(dataUrl);
    if (dataUrl) {
      setProductThumbnailUrl(null);
      saveLastImage(dataUrl);
    } else {
      clearLastImage();
    }
  }

  function handleDismissContext() {
    setUseContext(false);
    setCurrentTitle("");
    setCategory("");
    setKeyFeatures("");
  }

  function handleGenerate() {
    if (!currentTitle.trim() && !keyFeatures.trim() && !previewSrc) {
      toast.error("Ingresá al menos el título, las características o una foto del producto");
      return;
    }
    startTransition(async () => {
      try {
        const result = await generateDescription({
          productName: currentTitle,
          keyFeatures,
          brand,
          category,
          includes,
          warranty,
          returnPolicy,
          imageDataUrl: previewSrc || undefined,
        });
        if (!result) {
          toast.error("No se pudo generar la descripción, intentá de nuevo");
          return;
        }
        setDescription(result);
        // No se guardaba en ningún lado — se perdía al cambiar de
        // pestaña. Reusa lo que ya haya en contexto (títulos/keywords)
        // en vez de pisarlo.
        savePublicationContext({
          ...(context ?? { productId: selectedId, productName: currentTitle, keywords: [] }),
          productId: selectedId,
          productName: currentTitle || context?.productName || "",
          description: result,
        });
        toast.success("Descripción generada");
      } catch {
        toast.error("No se pudo generar la descripción, intentá de nuevo");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {context && useContext && (
          <ContextBanner
            sourceLabel="Optimizador SEO"
            summary={`Producto: ${context.productName} · ${context.keywords.length} palabras clave`}
            savedAt={context.savedAt}
            onDismiss={handleDismissContext}
          />
        )}

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
          <label className="text-sm font-medium">Título</label>
          <Input
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            placeholder="Ej: reloj inteligente para hombre y mujer"
            className="mt-1.5"
          />
        </div>

        <ImageUploadField
          label="Imagen del producto (opcional — enriquece la descripción)"
          hint="La IA describe lo que ve en la foto y lo suma como dato real a la descripción."
          previewSrc={previewSrc}
          onChange={handleImageChange}
        />

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

        <div>
          <label className="text-sm font-medium">Se entrega con (opcional)</label>
          <textarea
            value={includes}
            onChange={(e) => setIncludes(e.target.value)}
            placeholder={"Ej: 1 par de audífonos\nEstuche de carga\nCable USB\nManual de usuario"}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">Un ítem por línea (o separados por coma). Si lo dejás vacío, esa sección no aparece.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Garantía (opcional)</label>
            <Input
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              placeholder="Ej: 1 mes por defectos de fabricación"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Política de devolución (opcional)</label>
            <Input
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="Ej: 30 días para cambios"
              className="mt-1.5"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Estos 3 campos van tal cual los escribas — nunca los inventa la IA. Si los dejás vacíos, esas secciones simplemente no aparecen en la descripción.
        </p>

        <Button onClick={handleGenerate} disabled={isPending} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {isPending ? "Generando…" : "Generar Descripción"}
        </Button>
      </div>

      <div className="space-y-4">
        {!description && !isPending && (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            La descripción optimizada va a aparecer acá.
          </div>
        )}

        {isPending && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Generando descripción…
          </div>
        )}

        {description && !isPending && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-[0_0_20px_-14px_rgba(16,185,129,0.7)] transition-shadow hover:shadow-[0_0_26px_-10px_rgba(16,185,129,0.85)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Descripción optimizada</p>
              <CopyButton text={description} />
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{description}</p>
            <div className="mt-4 border-t border-border/60 pt-4">
              {selectedProduct?.meliItemId ? (
                <PublishToMeliButton
                  label="esta descripción"
                  content={description}
                  permalink={selectedProduct.permalink}
                  publish={(content) => publishDescriptionToMeli(selectedProduct.productId, content)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Elegí una publicación real arriba (no "Empezar desde cero") para poder publicar esta descripción
                  directo en Mercado Libre.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
