"use client";

import { useState } from "react";
import { Package, ShoppingCart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// Mockup propio inspirado en el layout real de una ficha de producto de
// Mercado Libre (Andes UI: franja de miniaturas vertical, título +
// "Nuevo"/vendidos, botones Comprar ahora/Agregar al carrito, envío,
// Descripción como card separada sobre fondo gris) — no es un clon
// pixel-perfect ni se publica a nadie, es una referencia dentro de la
// cuenta del usuario para decidir si publicar.
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
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Vista previa — así se vería en Mercado Libre</span>
      </div>

      {/* Fondo gris claro de la página real de ML, con las secciones como cards blancas separadas */}
      <div className="space-y-2 bg-[#ebebeb] p-3">
        <div className="rounded-lg bg-white p-4 text-[#333]">
          <div className="flex gap-2">
            {images.length > 1 && (
              <div className="flex max-h-[340px] flex-col gap-1.5 overflow-y-auto">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIndex(i)}
                    className={cn(
                      "h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 bg-white",
                      i === mainIndex ? "border-[#3483fa]" : "border-[#eee] hover:border-[#ccc]",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex aspect-square flex-1 items-center justify-center overflow-hidden rounded-lg bg-white">
              {mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImage} alt={title} className="h-full w-full object-contain" />
              ) : (
                <Package className="h-10 w-10 text-[#ccc]" />
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[13px] text-[#999]">Nuevo&nbsp;&nbsp;|&nbsp;&nbsp;+1 vendido</p>
            <h2 className="mt-1 text-xl leading-tight font-normal text-[#333]">{title || "(sin título)"}</h2>

            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[#00a650]">
              <Truck className="h-4 w-4" />
              Llega gratis mañana
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:max-w-[260px]">
              <button
                type="button"
                className="rounded-md bg-[#3483fa] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Comprar ahora
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md bg-[#eaf2ff] px-4 py-2.5 text-sm font-semibold text-[#3483fa]"
              >
                <ShoppingCart className="h-4 w-4" />
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 text-[#333]">
          <p className="text-base font-semibold">Descripción</p>
          <p className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-[#555]">
            {description || "(sin descripción)"}
          </p>
        </div>
      </div>
    </div>
  );
}
