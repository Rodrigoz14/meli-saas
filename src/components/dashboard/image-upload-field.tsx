"use client";

import { useId } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { fileToDataUrl } from "@/lib/file-to-data-url";

// Mismo campo de foto opcional que ya tenía el Generador de Imágenes,
// ahora reutilizado también en Optimizador SEO y Descripción — en los 3
// casos la foto es una fuente de contexto más (junto al nombre/URL), nunca
// obligatoria.
export function ImageUploadField({
  label,
  hint,
  previewSrc,
  onChange,
}: {
  label: string;
  hint?: string;
  previewSrc: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputId = useId();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy pesada (máximo 8MB)");
      return;
    }
    onChange(await fileToDataUrl(file));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {previewSrc && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Quitar
          </button>
        )}
      </div>
      <label
        htmlFor={inputId}
        className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-center transition-colors hover:bg-muted/40"
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="" className="max-h-28 rounded-lg object-contain" />
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Hacé clic para subir una foto (máx. 8MB)</span>
          </>
        )}
      </label>
      <input id={inputId} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
