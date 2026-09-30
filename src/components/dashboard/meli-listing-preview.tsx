"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Mockup propio de referencia (no un clon pixel-perfect de Mercado
// Libre) para que el usuario vea el título/fotos/descripción juntos
// antes de decidir publicar — vive dentro de su propia cuenta, no se
// publica ni distribuye a nadie más.
export function MeliListingPreview({
  title,
  images,
  description,
}: {
  title: string;
  images: string[];
  description: string;
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const mainImage = images[mainIndex];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white text-[#333]">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#f5a524]" />
        <span className="h-2 w-2 rounded-full bg-[#10b981]" />
        <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
        <span className="ml-1 text-[11px] font-medium text-muted-foreground">Así se vería en Mercado Libre</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#eee] bg-white">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={title} className="h-full w-full object-contain" />
            ) : (
              <Package className="h-10 w-10 text-muted-foreground/40" />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainIndex(i)}
                  className={cn(
                    "h-11 w-11 shrink-0 overflow-hidden rounded-md border-2",
                    i === mainIndex ? "border-[#3483fa]" : "border-transparent",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] text-[#999]">Nuevo · Nunca usado</p>
          <h2 className="mt-1 text-lg leading-tight font-medium text-[#333]">{title || "(sin título)"}</h2>
          <div className="mt-4 inline-block rounded-md bg-[#3483fa] px-4 py-2 text-sm font-semibold text-white opacity-60">
            Comprar ahora
          </div>

          <div className="mt-6 border-t border-[#eee] pt-4">
            <p className="text-sm font-semibold text-[#333]">Descripción</p>
            <p className="mt-2 max-h-56 overflow-y-auto text-sm whitespace-pre-wrap text-[#555]">
              {description || "(sin descripción)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
