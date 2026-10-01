"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeliListingPreview } from "@/components/dashboard/meli-listing-preview";
import {
  publishDescriptionToMeli,
  publishImagesToMeli,
  publishTitleToMeli,
  type PublishResult,
} from "@/app/dashboard/actions";
import { getLastPublicationContext, getPublicationContext, type PublicationContext } from "@/lib/publication-context";
import { getGeneratedImages } from "@/lib/infographic-store";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/infographic-categories";
import type { InfographicSetCategory } from "@/lib/ai";
import type { PublicationProduct } from "@/lib/publications-shared";

type ImageMap = Partial<Record<InfographicSetCategory, Blob>>;

// Un solo orden para TODO lo que se va a publicar (infografías + fotos
// subidas a mano) — antes eran 2 listas separadas sin orden entre ellas;
// el orden importa de verdad porque la PRIMERA foto incluida pasa a ser
// la portada de la publicación en Mercado Libre.
type ImageItem = {
  id: string;
  label: string;
  previewUrl: string;
  included: boolean;
  source: "infographic" | "extra";
  category?: InfographicSetCategory;
  dataUrl?: string; // solo para "extra" — ya es un data URL listo para publicar
};

type PublishResults = {
  title?: PublishResult;
  description?: PublishResult;
  images?: PublishResult;
};

// Junta lo que ya generaron las otras 3 pestañas (título elegido entre
// los 3 del Optimizador SEO, descripción, infografías) para revisar todo
// junto — con una previsualización — antes de decidir publicarlo de
// verdad en Mercado Libre en un solo paso.
export function PublishReview({ products }: { products: PublicationProduct[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState<PublicationContext | null>(null);
  const [images, setImages] = useState<ImageMap>({});
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [titleIndex, setTitleIndex] = useState(0);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResults | null>(null);

  const selectedProduct = products.find((p) => p.productId === selectedId);
  const titles = context?.titles?.length ? context.titles : context?.bestTitle ? [context.bestTitle] : [];
  const includedImages = imageItems.filter((i) => i.included);
  const previewImages = includedImages.map((i) => i.previewUrl);

  async function loadForProduct(productId: string) {
    setIsLoading(true);
    const ctx = getPublicationContext(productId);
    setContext(ctx);

    const loadedTitles = ctx?.titles?.length ? ctx.titles : ctx?.bestTitle ? [ctx.bestTitle] : [];
    setTitleIndex(0);
    setEditableTitle(loadedTitles[0] ?? "");
    setEditableDescription(ctx?.description ?? "");

    const blobs = await getGeneratedImages<InfographicSetCategory>(productId, CATEGORY_ORDER);
    setImages(blobs);
    const items: ImageItem[] = CATEGORY_ORDER.filter((c) => blobs[c]).map((category) => ({
      id: category,
      label: CATEGORY_LABELS[category],
      previewUrl: URL.createObjectURL(blobs[category]!),
      included: true,
      source: "infographic",
      category,
    }));
    setImageItems(items);
    setIsLoading(false);
  }

  useEffect(() => {
    const last = getLastPublicationContext();
    const initialId = last?.productId ?? "";
    setSelectedId(initialId);
    void loadForProduct(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    void loadForProduct(id);
  }

  function handleSelectTitle(index: number) {
    setTitleIndex(index);
    setEditableTitle(titles[index] ?? "");
  }

  async function handleAddExtraImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const tooBig = files.filter((f) => f.size > 8 * 1024 * 1024);
    if (tooBig.length > 0) {
      toast.error("Alguna imagen pesa más de 8MB y no se agregó");
    }
    const valid = files.filter((f) => f.size <= 8 * 1024 * 1024);
    const added = await Promise.all(
      valid.map(async (file, i) => {
        const dataUrl = await fileToDataUrl(file);
        return {
          id: `extra-${Date.now()}-${i}`,
          label: "Foto propia",
          previewUrl: dataUrl,
          included: true,
          source: "extra" as const,
          dataUrl,
        };
      }),
    );
    setImageItems((prev) => [...prev, ...added]);
  }

  function handleRemoveImageItem(id: string) {
    setImageItems((prev) => prev.filter((img) => img.id !== id));
  }

  function handleToggleImageItem(id: string) {
    setImageItems((prev) => prev.map((img) => (img.id === id ? { ...img, included: !img.included } : img)));
  }

  function handleMoveImageItem(index: number, direction: -1 | 1) {
    setImageItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    setDialogOpen(next);
    if (!next) setPublishResults(null);
  }

  async function handleConfirmPublish() {
    if (!selectedProduct) return;
    setIsPublishing(true);
    const productId = selectedProduct.productId;
    const results: PublishResults = {};

    if (editableTitle.trim()) {
      results.title = await publishTitleToMeli(productId, editableTitle.trim()).catch((err) => ({
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo publicar el título.",
      }));
    }
    if (editableDescription.trim()) {
      results.description = await publishDescriptionToMeli(productId, editableDescription.trim()).catch((err) => ({
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo publicar la descripción.",
      }));
    }
    if (includedImages.length > 0) {
      try {
        // El orden de este array es el orden real en que van a quedar las
        // fotos nuevas en la publicación — por eso se manda tal cual
        // quedó ordenado en pantalla, no se reordena acá.
        const payload = await Promise.all(
          includedImages.map(async (item, i) => ({
            category: item.source === "infographic" ? item.category! : `extra-${i + 1}`,
            dataUrl: item.source === "extra" ? item.dataUrl! : await fileToDataUrl(images[item.category!]!),
          })),
        );
        results.images = await publishImagesToMeli(productId, payload);
      } catch {
        results.images = { ok: false, error: "No se pudieron preparar las imágenes para subir." };
      }
    }

    setPublishResults(results);
    setIsPublishing(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando lo que ya generaste…
      </div>
    );
  }

  const hasAnything = titles.length > 0 || Boolean(context?.description) || imageItems.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Publicación real</label>
          <select
            value={selectedId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Sin publicación real —</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {!hasAnything && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay nada generado todavía para esta publicación. Generá un título en{" "}
            <span className="font-medium text-foreground">Optimizador SEO</span>, una{" "}
            <span className="font-medium text-foreground">Descripción</span>, o infografías en{" "}
            <span className="font-medium text-foreground">Generador de Imágenes</span> primero.
          </div>
        )}

        {titles.length > 0 && (
          <div>
            <label className="text-sm font-medium">Título</label>
            <select
              value={titleIndex}
              onChange={(e) => handleSelectTitle(Number(e.target.value))}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {titles.map((t, i) => (
                <option key={i} value={i}>
                  Opción {i + 1}: {t.slice(0, 50)}
                  {t.length > 50 ? "…" : ""}
                </option>
              ))}
            </select>
            <Input value={editableTitle} onChange={(e) => setEditableTitle(e.target.value)} className="mt-2" />
          </div>
        )}

        {context?.description !== undefined && (
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              value={editableDescription}
              onChange={(e) => setEditableDescription(e.target.value)}
              rows={8}
              className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Fotos a publicar</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ordenalas con las flechas — la primera que esté tildada pasa a ser la portada de la publicación.
          </p>
          <div className="mt-2 space-y-1.5">
            {imageItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border p-2 ${
                  item.included ? "border-border/60" : "border-dashed border-border/40 opacity-60"
                }`}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveImageItem(index, -1)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveImageItem(index, 1)}
                    disabled={index === imageItems.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={item.label} className="h-full w-full object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.label}</p>
                  {index === 0 && item.included && <p className="text-[11px] text-primary">Portada</p>}
                </div>

                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={() => handleToggleImageItem(item.id)}
                  title="Incluir al publicar"
                  className="h-3.5 w-3.5 shrink-0"
                />
                {item.source === "extra" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImageItem(item.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground hover:bg-muted/40">
              <Upload className="h-3.5 w-3.5" />
              Subir más fotos
              <input type="file" accept="image/*" multiple onChange={handleAddExtraImages} className="hidden" />
            </label>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <Button
            type="button"
            className="w-full"
            disabled={!selectedProduct?.meliItemId || !hasAnything}
            onClick={() => setDialogOpen(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            Publicar todo en Mercado Libre
          </Button>
          {!selectedProduct?.meliItemId && hasAnything && (
            <p className="text-xs text-muted-foreground">
              Elegí una publicación real arriba para poder publicar esto directo en Mercado Libre.
            </p>
          )}

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar en Mercado Libre</DialogTitle>
              <DialogDescription>
                Esto escribe de verdad sobre tu publicación real — título, descripción y las fotos elegidas se agregan a
                las que ya tiene. No se puede deshacer desde acá.
              </DialogDescription>
            </DialogHeader>

            {!publishResults && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {editableTitle.trim() && <li>• Título: &ldquo;{editableTitle.trim()}&rdquo;</li>}
                {editableDescription.trim() && <li>• Descripción ({editableDescription.trim().length} caracteres)</li>}
                {includedImages.length > 0 && <li>• {includedImages.length} foto(s) nueva(s), en el orden elegido</li>}
              </ul>
            )}

            {publishResults && (
              <div className="space-y-2 text-sm">
                <PublishResultRow label="Título" result={publishResults.title} />
                <PublishResultRow label="Descripción" result={publishResults.description} />
                <PublishResultRow label="Fotos" result={publishResults.images} />
                {selectedProduct?.permalink && (
                  <a
                    href={selectedProduct.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary underline"
                  >
                    Ver publicación real <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cerrar</DialogClose>
              {!publishResults && (
                <Button type="button" onClick={handleConfirmPublish} disabled={isPublishing}>
                  {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isPublishing ? "Publicando…" : "Sí, publicar todo"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <MeliListingPreview
          title={editableTitle}
          images={previewImages}
          description={editableDescription}
          categoryName={context?.categoryName}
        />
        {selectedProduct?.thumbnail && previewImages.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Image src={selectedProduct.thumbnail} alt="" width={20} height={20} className="rounded" unoptimized />
            Sin infografías generadas todavía — la previsualización usaría solo título y descripción.
          </div>
        )}
      </div>
    </div>
  );
}

function PublishResultRow({ label, result }: { label: string; result?: PublishResult }) {
  if (!result) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <span className="h-4 w-4 shrink-0" />
        {label}: no incluido
      </p>
    );
  }
  return (
    <p className={`flex items-start gap-2 ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
      {result.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>
        {label}: {result.ok ? "publicado" : "falló"}
        {result.error && <span className="block text-xs opacity-80">{result.error}</span>}
      </span>
    </p>
  );
}
