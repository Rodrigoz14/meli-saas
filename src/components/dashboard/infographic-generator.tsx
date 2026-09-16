"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon, Loader2, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Product = { productId: string; title: string; thumbnail: string; permalink: string };

const ACCENT_OPTIONS = [
  { label: "Índigo", value: "#5670f0" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Ámbar", value: "#f5a524" },
  { label: "Rosa", value: "#f43f5e" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function InfographicGenerator({ products }: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  // Solo una de las dos está activa a la vez: la foto subida a mano pisa a
  // la miniatura real de la publicación si el usuario sube su propia foto
  // después de elegir un producto.
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [productThumbnailUrl, setProductThumbnailUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_OPTIONS[0].value);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const previewSrc = uploadedDataUrl || productThumbnailUrl;

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    setResultUrl(null);
    if (!id) {
      setProductThumbnailUrl(null);
      return;
    }
    const product = products.find((p) => p.productId === id);
    if (!product) return;
    setProductName(product.title);
    setProductThumbnailUrl(product.thumbnail || null);
    setUploadedDataUrl(null); // la foto real de la publicación pisa cualquier archivo subido antes
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
    setProductThumbnailUrl(null); // el archivo subido a mano pisa la miniatura real
    setResultUrl(null);
  }

  async function handleGenerate() {
    if (!uploadedDataUrl && !productThumbnailUrl) {
      toast.error("Subí una foto o elegí una publicación real primero");
      return;
    }
    if (!productName.trim() && !keyFeatures.trim()) {
      toast.error("Ingresá el nombre del producto o sus características");
      return;
    }
    setIsGenerating(true);
    setResultUrl(null);
    try {
      const res = await fetch("/api/publications/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: uploadedDataUrl || undefined,
          imageUrl: uploadedDataUrl ? undefined : productThumbnailUrl || undefined,
          productName,
          keyFeatures,
          accentColor,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error || "No se pudo generar la infografía");
        return;
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      toast.success("Infografía generada");
    } catch {
      toast.error("No se pudo generar la infografía, intentá de nuevo");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
          <p className="mt-1 text-xs text-muted-foreground">
            Elegí una de tus publicaciones para usar su foto real, o subí tu propia imagen abajo.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Foto del producto</label>
          <label
            htmlFor="infographic-file"
            className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:bg-muted/40"
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Hacé clic para subir una foto (máx. 8MB)</span>
              </>
            )}
          </label>
          <input id="infographic-file" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {productThumbnailUrl && !uploadedDataUrl && (
            <p className="mt-1 text-xs text-emerald-500">✓ Usando la foto real de la publicación seleccionada</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Nombre del producto</label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ej: Smartwatch G30a con monitor de glucosa"
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Características clave</label>
          <textarea
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
            placeholder="Ej: batería 7 días, resistente al agua 5ATM, pantalla AMOLED 1.43'', incluye 2 correas..."
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

        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? "Generando…" : "Generar Infografía"}
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6">
        {!resultUrl && !isGenerating && (
          <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            La infografía generada va a aparecer acá.
          </div>
        )}
        {isGenerating && (
          <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            Generando infografía…
          </div>
        )}
        {resultUrl && !isGenerating && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="Infografía generada"
              className="w-full max-w-md rounded-xl border border-border shadow-[0_0_30px_-14px_rgba(99,102,241,0.7)]"
            />
            <a
              href={resultUrl}
              download="infografia-meliboost.png"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Descargar PNG
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
