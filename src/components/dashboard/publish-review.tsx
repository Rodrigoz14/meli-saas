"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Package, Send } from "lucide-react";
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
type UrlMap = Partial<Record<InfographicSetCategory, string>>;
type SelectedMap = Partial<Record<InfographicSetCategory, boolean>>;

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
  const [imageUrls, setImageUrls] = useState<UrlMap>({});
  const [selectedImages, setSelectedImages] = useState<SelectedMap>({});
  const [titleIndex, setTitleIndex] = useState(0);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResults | null>(null);

  const selectedProduct = products.find((p) => p.productId === selectedId);
  const titles = context?.titles?.length ? context.titles : context?.bestTitle ? [context.bestTitle] : [];
  const previewImages = CATEGORY_ORDER.map((c) => imageUrls[c]).filter((u): u is string => Boolean(u));

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
    const urls: UrlMap = {};
    for (const category of CATEGORY_ORDER) {
      const blob = blobs[category];
      if (blob) urls[category] = URL.createObjectURL(blob);
    }
    setImageUrls(urls);
    setSelectedImages(Object.fromEntries(CATEGORY_ORDER.map((c) => [c, Boolean(blobs[c])])) as SelectedMap);
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
    const chosenCategories = CATEGORY_ORDER.filter((c) => selectedImages[c] && images[c]);
    if (chosenCategories.length > 0) {
      try {
        const payload = await Promise.all(
          chosenCategories.map(async (category) => ({ category, dataUrl: await fileToDataUrl(images[category]!) })),
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

  const hasAnything = titles.length > 0 || Boolean(context?.description) || previewImages.length > 0;

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

        {previewImages.length > 0 && (
          <div>
            <label className="text-sm font-medium">Infografías generadas</label>
            <p className="mt-0.5 text-xs text-muted-foreground">Elegí cuáles subir como fotos reales de la publicación.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CATEGORY_ORDER.map((category) => {
                const url = imageUrls[category];
                return (
                  <label
                    key={category}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center ${
                      url ? "cursor-pointer border-border/60" : "border-dashed border-border/40 opacity-50"
                    }`}
                  >
                    <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={CATEGORY_LABELS[category]} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[category]}</span>
                    {url && (
                      <input
                        type="checkbox"
                        checked={Boolean(selectedImages[category])}
                        onChange={(e) => setSelectedImages((prev) => ({ ...prev, [category]: e.target.checked }))}
                        className="h-3.5 w-3.5"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

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
                {CATEGORY_ORDER.filter((c) => selectedImages[c] && images[c]).length > 0 && (
                  <li>• {CATEGORY_ORDER.filter((c) => selectedImages[c] && images[c]).length} foto(s) nueva(s)</li>
                )}
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
