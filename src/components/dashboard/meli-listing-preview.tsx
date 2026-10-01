"use client";

import { useState } from "react";
import { ChevronRight, MessageCircleQuestion, Package, ShoppingCart, Star, Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// Mockup propio inspirado en el layout real y completo de una ficha de
// producto de Mercado Libre (Andes UI): galería con miniaturas verticales
// + título a la izquierda, y una caja de compra separada a la derecha
// (envío, vendedor, botones, medios de pago) — tal como se ve en una
// publicación real de escritorio — seguido de las secciones de abajo
// (características, descripción, preguntas, opiniones). Se muestra como
// una publicación recién creada (sin historial todavía, por eso
// preguntas/opiniones usan el mismo estado vacío real que usa Mercado
// Libre, en vez de inventar reseñas que no existen). No es un clon
// pixel-perfect ni se publica a nadie, es una referencia dentro de la
// cuenta del usuario para decidir si publicar.
export function MeliListingPreview({
  title,
  images,
  description,
  categoryName,
}: {
  title: string;
  images: string[];
  description: string;
  categoryName?: string;
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const mainImage = images[mainIndex];

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Vista previa — así se vería en Mercado Libre</span>
      </div>

      {/* Fondo gris claro de la página real de ML, con cada sección como card blanca separada */}
      <div className="space-y-2 bg-[#ebebeb] p-3 text-[#333]">
        <div className="flex items-center justify-between px-1 text-[12px]">
          {categoryName ? (
            <p className="flex items-center gap-1 text-[#3483fa]">
              Inicio <ChevronRight className="h-3 w-3 text-[#999]" /> {categoryName}
            </p>
          ) : (
            <span />
          )}
          <span className="text-[#3483fa]">Compartir</span>
        </div>

        {/* Galería + título a la izquierda, caja de compra separada a la derecha — mismo layout que una ficha real de escritorio */}
        <div className="grid gap-2 lg:grid-cols-[1fr_230px]">
          <div className="rounded-lg bg-white p-4">
            <div className="flex gap-2">
              {images.length > 1 && (
                <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainIndex(i)}
                      className={cn(
                        "h-11 w-11 shrink-0 overflow-hidden rounded-md border-2 bg-white",
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

            <div className="mt-4 border-t border-[#eee] pt-3">
              <p className="text-[13px] text-[#999]">Nuevo</p>
              <h2 className="mt-1 text-xl leading-tight font-normal text-[#333]">{title || "(sin título)"}</h2>
            </div>
          </div>

          {/* Caja de compra: envío, vendedor, botones y medios de pago — separada del título, igual que en la ficha real */}
          <div className="rounded-lg bg-white p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#00a650]">
              <Truck className="h-4 w-4 shrink-0" />
              Envío gratis a todo el país
            </p>
            <p className="mt-1 text-[12px] text-[#3483fa]">Calcular cuándo llega</p>

            <div className="mt-3 flex items-center gap-2 border-t border-[#eee] pt-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0]">
                <Store className="h-3.5 w-3.5 text-[#999]" />
              </div>
              <p className="text-[12px] text-[#555]">
                Vendido por <span className="font-medium text-[#333]">Tu tienda</span>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-[#eee] pt-3">
              <button type="button" className="rounded-md bg-[#3483fa] px-3 py-2 text-sm font-semibold text-white">
                Comprar ahora
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md bg-[#eaf2ff] px-3 py-2 text-sm font-semibold text-[#3483fa]"
              >
                <ShoppingCart className="h-4 w-4" />
                Agregar al carrito
              </button>
            </div>

            <p className="mt-3 border-t border-[#eee] pt-3 text-[11px] text-[#999]">
              Mercado Pago · Tarjetas, débito y efectivo
            </p>
          </div>
        </div>

        {/* Características principales */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base font-semibold">Características principales</p>
          {categoryName ? (
            <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-[#999]">Categoría</span>
              <span>{categoryName}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#999]">Se completan al publicar en Mercado Libre.</p>
          )}
        </div>

        {/* Descripción */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base font-semibold">Descripción</p>
          <p className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-[#555]">
            {description || "(sin descripción)"}
          </p>
        </div>

        {/* Preguntas y respuestas — estado real de una publicación nueva, sin preguntas todavía */}
        <div className="rounded-lg bg-white p-4">
          <p className="flex items-center gap-2 text-base font-semibold">
            <MessageCircleQuestion className="h-4 w-4 text-[#3483fa]" />
            Preguntas y respuestas
          </p>
          <div className="mt-2 rounded-md border border-[#eee] px-3 py-2 text-sm text-[#999]">Escribí tu pregunta...</div>
          <p className="mt-3 text-sm text-[#999]">Todavía no hay preguntas. ¡Sé el primero en preguntar!</p>
        </div>

        {/* Opiniones — ídem, estado real sin opiniones todavía */}
        <div className="rounded-lg bg-white p-4">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Star className="h-4 w-4 text-[#3483fa]" />
            Opiniones del producto
          </p>
          <p className="mt-2 text-sm text-[#999]">Este producto todavía no tiene opiniones.</p>
        </div>
      </div>
    </div>
  );
}
