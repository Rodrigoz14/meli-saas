"use client";

import { useState } from "react";
import { ChevronRight, ImageIcon, MessageCircleQuestion, Package, Search, ShoppingCart, Star, Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const SIMILAR_PLACEHOLDERS = Array.from({ length: 5 });

// Mockup propio de cómo quedaría la publicación — mismo layout de una ficha
// de marketplace (galería + título a la izquierda, caja de compra separada
// a la derecha, secciones de características/descripción/preguntas/
// opiniones abajo), pero con la paleta propia de MeliBoost, nunca la
// interfaz, los colores ni la tipografía reales de Mercado Libre (marca de
// terceros). Se muestra como una publicación recién creada (sin historial
// todavía, por eso preguntas/opiniones usan un estado vacío real en vez de
// inventar reseñas que no existen). No es un clon pixel-perfect ni se
// publica a nadie, es una referencia dentro de la cuenta del usuario para
// decidir si publicar.
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
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Vista previa — así se vería tu publicación</span>
      </div>

      {/* Barra de búsqueda genérica de marketplace, en la paleta propia de MeliBoost */}
      <div className="bg-muted px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-card px-3 py-1.5 text-[12px] text-muted-foreground">
          <Search className="h-3.5 w-3.5 shrink-0" />
          Buscar productos, marcas y más...
        </div>
      </div>

      {/* "También te puede interesar" — placeholders genéricos, sin datos reales */}
      <div className="bg-muted/60 px-3 py-2.5">
        <p className="px-1 text-[11px] text-muted-foreground">También puede interesarte</p>
        <div className="mt-1.5 flex gap-2 overflow-x-auto">
          {SIMILAR_PLACEHOLDERS.map((_, i) => (
            <div
              key={i}
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-muted"
            >
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      {/* Fondo neutro, con cada sección como tarjeta separada */}
      <div className="space-y-2 bg-muted/40 p-3 text-foreground">
        <div className="flex items-center justify-between px-1 text-[12px]">
          {categoryName ? (
            <p className="flex items-center gap-1 text-primary">
              Inicio <ChevronRight className="h-3 w-3 text-muted-foreground" /> {categoryName}
            </p>
          ) : (
            <span />
          )}
          <span className="text-primary">Compartir</span>
        </div>

        {/* Galería + título a la izquierda, caja de compra separada a la derecha */}
        <div className="grid gap-2 lg:grid-cols-[1fr_230px]">
          <div className="rounded-xl bg-card p-4">
            <div className="flex gap-2">
              {images.length > 1 && (
                <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainIndex(i)}
                      className={cn(
                        "h-11 w-11 shrink-0 overflow-hidden rounded-md border-2 bg-card",
                        i === mainIndex ? "border-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex aspect-square flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainImage} alt={title} className="h-full w-full object-contain" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[13px] text-muted-foreground">Nuevo</p>
              <h2 className="mt-1 text-xl leading-tight font-normal text-foreground">{title || "(sin título)"}</h2>
            </div>
          </div>

          {/* Caja de compra: envío, vendedor, botones y medios de pago */}
          <div className="rounded-xl bg-card p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-success">
              <Truck className="h-4 w-4 shrink-0" />
              Envío gratis a todo el país
            </p>
            <p className="mt-1 text-[12px] text-primary">Calcular cuándo llega</p>

            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Vendido por <span className="font-medium text-foreground">Tu tienda</span>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <button type="button" className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Comprar ahora
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/70"
              >
                <ShoppingCart className="h-4 w-4" />
                Agregar al carrito
              </button>
            </div>

            <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
              Tarjetas, débito y efectivo
            </p>
          </div>
        </div>

        {/* Características principales */}
        <div className="rounded-xl bg-card p-4">
          <p className="text-base font-semibold">Características principales</p>
          {categoryName ? (
            <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Categoría</span>
              <span>{categoryName}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Se completan al publicar en Mercado Libre.</p>
          )}
        </div>

        {/* Descripción */}
        <div className="rounded-xl bg-card p-4">
          <p className="text-base font-semibold">Descripción</p>
          <p className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {description || "(sin descripción)"}
          </p>
        </div>

        {/* Preguntas y respuestas — estado real de una publicación nueva, sin preguntas todavía */}
        <div className="rounded-xl bg-card p-4">
          <p className="flex items-center gap-2 text-base font-semibold">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
            Preguntas y respuestas
          </p>
          <div className="mt-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            Escribí tu pregunta...
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Todavía no hay preguntas. ¡Sé el primero en preguntar!</p>
        </div>

        {/* Opiniones — ídem, estado real sin opiniones todavía */}
        <div className="rounded-xl bg-card p-4">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Star className="h-4 w-4 text-primary" />
            Opiniones del producto
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Este producto todavía no tiene opiniones.</p>
        </div>
      </div>
    </div>
  );
}
