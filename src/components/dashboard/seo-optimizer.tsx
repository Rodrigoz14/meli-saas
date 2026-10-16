"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronDown, Loader2, Package, Search, Sparkles, TriangleAlert, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/dashboard/copy-button";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { PublishToMeliButton } from "@/components/dashboard/publish-to-meli-button";
import {
  generateMoreSeoTitles,
  publishTitleToMeli,
  regenerateSeoTitlesWithAttributes,
  runSeoOptimizer,
  type CategoryTier,
  type SeoOptimizerResult,
} from "@/app/dashboard/actions";
import { getLastImage, saveLastImage, clearLastImage, savePublicationContext } from "@/lib/publication-context";
import type { PublicationProduct } from "@/lib/publications-shared";
import { TITLE_RULES, auditTitle, type RankedWord } from "@/lib/title-rules";

const TIER_STYLES: Record<CategoryTier, string> = {
  alta: "border-border bg-success-bg text-success",
  media: "border-border bg-warning-bg text-warning",
  baja: "border-border bg-muted text-muted-foreground",
};

const TIER_DOT: Record<CategoryTier, string> = {
  alta: "bg-success",
  media: "bg-warning",
  baja: "bg-muted-foreground",
};

const TIER_LABELS: Record<CategoryTier, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

// Las reglas quedan a la vista, plegadas, por dos razones: el vendedor
// entiende por qué un título "raro" (sin conectores y sin que se lea como
// una frase) está bien, y puede contrastar a mano cualquier aviso.
function TitleRulesDisclosure() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/40"
      >
        Las 10 reglas que sigue el generador
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="space-y-1.5 border-t border-border/60 px-3 py-2.5">
          {TITLE_RULES.map((rule) => (
            <li key={rule.id} className="flex gap-2 text-xs">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {rule.id}
              </span>
              <span>
                <span className="font-medium">{rule.label}.</span>{" "}
                <span className="text-muted-foreground">{rule.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TitleCard({
  index,
  title,
  limit,
  catalog,
  keywords,
  rankedWords,
  publishTarget,
}: {
  index: number;
  title: string;
  limit: number;
  catalog?: boolean;
  // Las keywords reales de la investigación: sin ellas no se puede juzgar
  // si las 3 primeras palabras son palabra clave ni si un conector estaba
  // justificado.
  keywords: string[];
  // Ranking de palabras por demanda real: con él, la regla 10 comprueba
  // que el título arranque por la más buscada, no solo por una keyword.
  rankedWords: RankedWord[];
  // El título de catálogo no es un campo real de Mercado Libre (es un
  // concepto propio de MeliBoost) — por eso solo los 3 títulos normales
  // reciben publishTarget y pueden publicarse de verdad.
  publishTarget?: { productId: string; permalink: string };
}) {
  const over = title.length > limit;
  const pct = Math.min(100, Math.round((title.length / limit) * 100));
  // El título de catálogo tiene otro límite y no persigue las mismas
  // reglas de posicionamiento, así que no se audita.
  const issues = catalog ? [] : auditTitle(title, keywords, limit, rankedWords);
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        catalog ? "border-primary/30 bg-primary/5" : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              catalog ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary",
            )}
          >
            {index}
          </span>
          <div>
            {catalog && <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Catálogo</p>}
            <p className="text-sm font-semibold">{title}</p>
          </div>
        </div>
        <CopyButton text={title} />
      </div>
      <div className="mt-2 flex items-center gap-2 pl-7.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("shrink-0 text-xs", over ? "text-destructive" : "text-muted-foreground")}>
          {title.length}/{limit} caracteres
        </span>
      </div>
      {issues.length > 0 && (
        <ul className="mt-2 space-y-1 pl-7.5">
          {issues.map((issue) => (
            <li key={issue.ruleId} className="flex items-start gap-1.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <span className="font-medium">Regla {issue.ruleId}:</span> {issue.message}
              </span>
            </li>
          ))}
        </ul>
      )}
      {publishTarget && (
        <div className="mt-2 pl-7.5">
          <PublishToMeliButton
            label="este título"
            content={title}
            permalink={publishTarget.permalink}
            publish={(content) => publishTitleToMeli(publishTarget.productId, content)}
          />
        </div>
      )}
    </div>
  );
}

export function SeoOptimizer({ products, siteId }: { products: PublicationProduct[]; siteId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productThumbnailUrl, setProductThumbnailUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SeoOptimizerResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  // Caracteristicas de la categoria que el vendedor marco como ciertas de
  // su producto. Se guardan aparte del resultado porque sobreviven a
  // regenerar los titulos.
  const [checkedAttributes, setCheckedAttributes] = useState<string[]>([]);
  const [isApplyingAttributes, setIsApplyingAttributes] = useState(false);

  const selectedProduct = products.find((p) => p.productId === selectedId);
  const previewSrc = imageDataUrl || productThumbnailUrl;

  // Si ya subiste o elegiste una foto en otra pestaña (Descripción o
  // Imágenes), acá aparece precargada sola — no hace falta volver a
  // subirla para reusar la info entre pestañas.
  useEffect(() => {
    const shared = getLastImage();
    if (!shared || previewSrc) return;
    if (shared.startsWith("data:")) setImageDataUrl(shared);
    else setProductThumbnailUrl(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectProduct(id: string) {
    setSelectedId(id);
    const product = products.find((p) => p.productId === id);
    setProductName(product?.title ?? "");
    setProductThumbnailUrl(product?.thumbnail || null);
    setImageDataUrl(null);
    setResult(null);
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

  function handleGenerate() {
    if (!productName.trim() && !previewSrc) {
      toast.error("Ingresá el nombre del producto o subí una foto");
      return;
    }
    startTransition(async () => {
      try {
        const data = await runSeoOptimizer({
          productName,
          brand: brand || undefined,
          keyFeatures: keyFeatures || undefined,
          categoryIdHint: selectedProduct?.categoryId || undefined,
          siteId,
          imageDataUrl: previewSrc || undefined,
        });
        setResult(data);
        savePublicationContext({
          productId: selectedId,
          productName,
          categoryId: data.categoryId ?? undefined,
          categoryName: data.categoryName ?? undefined,
          keywords: data.keywords,
          rawKeyFeatures: keyFeatures || undefined,
          bestTitle: data.titles[0],
          titles: data.titles,
          catalogTitle: data.catalogTitle || undefined,
        });
        setCheckedAttributes([]);
        toast.success("Palabras clave y títulos generados");
      } catch {
        toast.error("No se pudo generar el resultado, intentá de nuevo");
      }
    });
  }

  async function handleApplyAttributes() {
    if (!result || checkedAttributes.length === 0) return;
    setIsApplyingAttributes(true);
    try {
      const fresh = await regenerateSeoTitlesWithAttributes({
        productName,
        keywords: keywordTerms,
        categoryName: result.categoryName ?? undefined,
        brand,
        keyFeatures,
        maxTitleLength: result.maxTitleLength,
        rankedWords: result.rankedWords,
        confirmedAttributes: checkedAttributes,
      });
      if (!fresh || fresh.titles.length === 0) {
        toast.error("No se pudieron rehacer los títulos, intentá de nuevo");
        return;
      }
      setResult({ ...result, titles: fresh.titles, catalogTitle: fresh.catalogTitle });
      toast.success("Títulos rehechos con tus características");
    } catch {
      toast.error("No se pudieron rehacer los títulos, intentá de nuevo");
    } finally {
      setIsApplyingAttributes(false);
    }
  }

  async function handleGenerateMore() {
    if (!result) return;
    setIsGeneratingMore(true);
    try {
      const newTitles = await generateMoreSeoTitles({
        productName,
        keywords: result.keywords.map((k) => k.term),
        categoryName: result.categoryName ?? undefined,
        brand: brand || undefined,
        keyFeatures: keyFeatures || undefined,
        excludeTitles: result.titles,
        maxTitleLength: result.maxTitleLength,
        rankedWords: result.rankedWords,
      });
      if (newTitles.length === 0) {
        toast.error("No se pudieron generar más títulos, intentá de nuevo");
        return;
      }
      const existingLower = new Set(result.titles.map((t) => t.toLowerCase()));
      const uniqueNew = newTitles.filter((t) => !existingLower.has(t.toLowerCase()));
      const updatedTitles = [...result.titles, ...uniqueNew];
      setResult({ ...result, titles: updatedTitles });
      savePublicationContext({
        productId: selectedId,
        productName,
        categoryId: result.categoryId ?? undefined,
        categoryName: result.categoryName ?? undefined,
        keywords: result.keywords,
        rawKeyFeatures: keyFeatures || undefined,
        bestTitle: updatedTitles[0],
        titles: updatedTitles,
        catalogTitle: result.catalogTitle || undefined,
      });
      toast.success(`${uniqueNew.length} título(s) nuevo(s) generado(s)`);
    } catch {
      toast.error("No se pudo generar más títulos, intentá de nuevo");
    } finally {
      setIsGeneratingMore(false);
    }
  }

  // Los términos sueltos, sin el tier — es lo que necesita auditTitle para
  // decidir si una palabra del título salió de la investigación o no.
  const keywordTerms = result?.keywords.map((k) => k.term) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.4fr)]">
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

        <div>
          <label className="text-sm font-medium">Características clave (opcional)</label>
          <textarea
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            placeholder="Ej: bluetooth 5.3, cancelación de ruido, batería 20h, resistente al agua..."
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cuantas más características reales pongas, más detallados salen los títulos y las keywords — nunca se inventan atributos que no pongas acá.
          </p>
        </div>

        <ImageUploadField
          label="Foto del producto (opcional)"
          hint="La IA la usa como dato extra para detectar el producto y sugerir keywords/títulos, igual que el nombre."
          previewSrc={previewSrc}
          onChange={handleImageChange}
        />

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

            {result.categoryTrending.length > 0 && (
              <div className="rounded-2xl border border-border bg-warning-bg p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-warning" />
                  <p className="text-sm font-medium text-warning">
                    Más buscados en categoría ({result.categoryTrending.length} tendencias)
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", TIER_DOT.alta)} /> Alta (cat. general)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", TIER_DOT.media)} /> Media (cat. padre)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", TIER_DOT.baja)} /> Baja (cat. específica)
                  </span>
                </div>
                {result.categoryPath.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Categorías analizadas:{" "}
                    {[...result.categoryPath]
                      .reverse()
                      .map((c) => c.name)
                      .join(" → ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.categoryTrending.map((t) => (
                    <span
                      key={t.term}
                      className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", TIER_STYLES[t.tier])}
                    >
                      {t.term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.keywords.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-medium">Keywords filtrados por IA ({result.keywords.length})</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Solo los que aplican a tu producto</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.keywords.map((k) => (
                    <span
                      key={k.term}
                      className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", TIER_STYLES[k.score])}
                    >
                      {k.term} <span className="opacity-70">· {TIER_LABELS[k.score]}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(result.titles.length > 0 || result.catalogTitle) && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-medium">Títulos optimizados</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {result.titles.length} títulos para publicación ({result.maxTitleLength} car., el máximo que admite
                  esta categoría) + 1 para catálogo · solo palabras clave de la investigación
                </p>
                {result.rankedWords.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs font-medium">Orden por demanda real</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Contado sobre las búsquedas reales de la categoría en Mercado Libre. La primera debe abrir el
                      título.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.rankedWords.slice(0, 8).map((w, i) => (
                        <span
                          key={w.word}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                            i === 0
                              ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                              : "border-border bg-card text-muted-foreground",
                          )}
                          title={`Aparece en ${w.searches} búsquedas distintas`}
                        >
                          <span className="font-mono opacity-60">{i + 1}</span>
                          {w.word}
                          <span className="opacity-60">{w.searches}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.titleAttributes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border/60 p-3">
                    <p className="text-xs font-medium">Características reales de tu producto</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Son los atributos con los que los compradores filtran en esta categoría, tal como los define
                      Mercado Libre. Marcá solo los que de verdad aplican a tu producto: sirven para llenar los
                      caracteres que sobran sin inventar nada ni usar marcas ajenas.
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {result.titleAttributes.slice(0, 8).map((attr) => (
                        <div key={attr.id}>
                          <p className="text-[11px] text-muted-foreground">{attr.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {attr.values.map((value) => {
                              const activo = checkedAttributes.includes(value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    setCheckedAttributes((prev) =>
                                      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
                                    )
                                  }
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                                    activo
                                      ? "border-primary/40 bg-primary/15 font-medium text-primary"
                                      : "border-border bg-card text-muted-foreground hover:bg-muted/60",
                                  )}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyAttributes}
                      disabled={checkedAttributes.length === 0 || isApplyingAttributes}
                      className="mt-3"
                    >
                      {isApplyingAttributes ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {isApplyingAttributes
                        ? "Rehaciendo…"
                        : `Rehacer títulos con ${checkedAttributes.length || "estas"} característica${
                            checkedAttributes.length === 1 ? "" : "s"
                          }`}
                    </Button>
                  </div>
                )}
                <TitleRulesDisclosure />
                <div className="mt-3 space-y-2.5">
                  {result.titles.map((title, i) => (
                    <TitleCard
                      key={i}
                      index={i + 1}
                      title={title}
                      limit={result.maxTitleLength}
                      keywords={keywordTerms}
                      rankedWords={result.rankedWords}
                      publishTarget={
                        selectedProduct?.meliItemId
                          ? { productId: selectedProduct.productId, permalink: selectedProduct.permalink }
                          : undefined
                      }
                    />
                  ))}
                  {result.catalogTitle && (
                    <TitleCard
                      index={result.titles.length + 1}
                      title={result.catalogTitle}
                      limit={Math.max(120, result.maxTitleLength)}
                      keywords={keywordTerms}
                      rankedWords={result.rankedWords}
                      catalog
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMore}
                  disabled={isGeneratingMore}
                  className="mt-3"
                >
                  {isGeneratingMore ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isGeneratingMore ? "Generando…" : "Generar más títulos"}
                </Button>
                {!selectedProduct?.meliItemId && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Elegí una publicación real arriba (no "Empezar desde cero") para poder publicar estos títulos
                    directo en Mercado Libre.
                  </p>
                )}
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
