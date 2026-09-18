"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { suggestInfographicSetClaims } from "@/app/dashboard/actions";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";

type Product = { productId: string; title: string; thumbnail: string; permalink: string };

const ACCENT_OPTIONS = [
  { label: "Índigo", value: "#5670f0" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Ámbar", value: "#f5a524" },
  { label: "Rosa", value: "#f43f5e" },
];

const CATEGORY_ORDER: InfographicSetCategory[] = ["producto", "beneficios", "comparacion", "en_uso", "aclaracion"];

const CATEGORY_LABELS: Record<InfographicSetCategory, string> = {
  producto: "1. Producto",
  beneficios: "2. Beneficios",
  comparacion: "3. Comparación",
  en_uso: "4. Producto en uso",
  aclaracion: "5. Aclaración",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function emptyClaims(): InfographicClaim[] {
  return CATEGORY_ORDER.map((category) => ({ category, headline: "", subtext: "", bullets: [] }));
}

export function InfographicSetGenerator({ products }: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [productThumbnailUrl, setProductThumbnailUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_OPTIONS[0].value);
  const [claims, setClaims] = useState<InfographicClaim[]>(emptyClaims());
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Record<InfographicSetCategory, string | null>>(
    {} as Record<InfographicSetCategory, string | null>,
  );

  const previewSrc = uploadedDataUrl || productThumbnailUrl;

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    if (!id) {
      setProductThumbnailUrl(null);
      return;
    }
    const product = products.find((p) => p.productId === id);
    if (!product) return;
    setProductName(product.title);
    setProductThumbnailUrl(product.thumbnail || null);
    setUploadedDataUrl(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy pesada (máximo 8MB)");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setUploadedDataUrl(dataUrl);
    setProductThumbnailUrl(null);
  }

  async function handleSuggest() {
    if (!productName.trim() && !keyFeatures.trim()) {
      toast.error("Ingresá el nombre del producto o sus características primero");
      return;
    }
    setIsSuggesting(true);
    try {
      const suggested = await suggestInfographicSetClaims(productName, keyFeatures);
      if (suggested.length === 0) {
        toast.error("No se pudieron generar sugerencias, revisá el nombre/características");
        return;
      }
      // Se completa por categoría (no por posición) para que, si el modelo
      // devuelve menos de 5, cada tarjeta se quede con su propio texto vacío
      // en vez de desalinearse con la categoría de al lado.
      setClaims((prev) =>
        prev.map((c) => suggested.find((s) => s.category === c.category) ?? c),
      );
      toast.success("Sugerencias generadas — revisalas antes de generar las imágenes");
    } catch {
      toast.error("No se pudo generar la sugerencia, intentá de nuevo");
    } finally {
      setIsSuggesting(false);
    }
  }

  function updateClaim(category: InfographicSetCategory, patch: Partial<InfographicClaim>) {
    setClaims((prev) => prev.map((c) => (c.category === category ? { ...c, ...patch } : c)));
  }

  function updateBullet(category: InfographicSetCategory, index: number, value: string) {
    setClaims((prev) =>
      prev.map((c) =>
        c.category === category ? { ...c, bullets: c.bullets.map((b, i) => (i === index ? value : b)) } : c,
      ),
    );
  }

  async function handleGenerateAll() {
    if (!uploadedDataUrl && !productThumbnailUrl) {
      toast.error("Subí una foto o elegí una publicación real primero");
      return;
    }
    const hasAnyText = claims.some((c) => c.headline.trim());
    if (!hasAnyText) {
      toast.error("Generá o escribí los textos de cada infografía antes de generar las imágenes");
      return;
    }

    setIsGenerating(true);
    setResults({} as Record<InfographicSetCategory, string | null>);

    const outcomes = await Promise.all(
      claims.map(async (claim) => {
        try {
          const res = await fetch("/api/publications/infographic-set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageDataUrl: uploadedDataUrl || undefined,
              imageUrl: uploadedDataUrl ? undefined : productThumbnailUrl || undefined,
              accentColor,
              claim,
            }),
          });
          if (!res.ok) return { category: claim.category, url: null };
          const blob = await res.blob();
          return { category: claim.category, url: URL.createObjectURL(blob) };
        } catch {
          return { category: claim.category, url: null };
        }
      }),
    );

    const next = {} as Record<InfographicSetCategory, string | null>;
    let failures = 0;
    for (const o of outcomes) {
      next[o.category] = o.url;
      if (!o.url) failures += 1;
    }
    setResults(next);
    setIsGenerating(false);

    if (failures === 0) toast.success("Set de 5 infografías generado");
    else if (failures < outcomes.length) toast.error(`${failures} de 5 infografías fallaron — probá regenerar esas`);
    else toast.error("No se pudo generar el set de infografías");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Publicación real (opcional)</label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Subir foto propia —</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Foto del producto</label>
          <label
            htmlFor="infographic-set-file"
            className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:bg-muted/40"
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="max-h-36 rounded-lg object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Hacé clic para subir una foto (máx. 8MB)</span>
              </>
            )}
          </label>
          <input
            id="infographic-set-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {productThumbnailUrl && !uploadedDataUrl && (
            <p className="mt-1 text-xs text-emerald-500">✓ Usando la foto real de la publicación seleccionada</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Nombre del producto</label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ej: Whey Pure Vainilla 5Lb"
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Características clave</label>
          <textarea
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            placeholder="Ej: 26g proteína por porción, sin azúcar añadida, baja en calorías, se toma en agua o leche..."
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Color de acento</label>
          <div className="mt-1.5 flex gap-2">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccentColor(opt.value)}
                title={opt.label}
                style={{ backgroundColor: opt.value }}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  accentColor === opt.value ? "scale-110 border-foreground" : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        <Button onClick={handleSuggest} disabled={isSuggesting} variant="outline" className="w-full">
          <Wand2 className="mr-2 h-4 w-4" />
          {isSuggesting ? "Sugiriendo…" : "Sugerir textos con IA"}
        </Button>

        <div className="space-y-3">
          {claims.map((claim) => (
            <div key={claim.category} className="rounded-xl border border-border/60 p-3">
              <p className="text-xs font-semibold text-muted-foreground">{CATEGORY_LABELS[claim.category]}</p>
              <Input
                value={claim.headline}
                onChange={(e) => updateClaim(claim.category, { headline: e.target.value })}
                placeholder="Titular..."
                className="mt-1.5 h-8 text-sm"
              />
              <Input
                value={claim.subtext}
                onChange={(e) => updateClaim(claim.category, { subtext: e.target.value })}
                placeholder="Subtexto (opcional)..."
                className="mt-1.5 h-8 text-sm"
              />
              {claim.bullets.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {claim.bullets.map((b, i) => (
                    <Input
                      key={i}
                      value={b}
                      onChange={(e) => updateBullet(claim.category, i, e.target.value)}
                      className="h-8 text-xs"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleGenerateAll} disabled={isGenerating} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Generando las 5 infografías…" : "Generar las 5 infografías"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const url = results[category];
          return (
            <div
              key={category}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 text-center"
            >
              <p className="text-xs font-semibold text-muted-foreground">{CATEGORY_LABELS[category]}</p>
              {isGenerating && !url && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              {!isGenerating && !url && <ImageIcon className="h-6 w-6 text-muted-foreground/50" />}
              {url && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={CATEGORY_LABELS[category]}
                    className="w-full rounded-lg border border-border shadow-[0_0_24px_-14px_rgba(99,102,241,0.7)]"
                  />
                  <a
                    href={url}
                    download={`infografia-${category}-meliboost.png`}
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </a>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
