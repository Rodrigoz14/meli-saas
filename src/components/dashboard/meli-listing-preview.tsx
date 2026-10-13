"use client";

import { useState } from "react";
import { ChevronRight, ImageIcon, MessageCircleQuestion, Package, Search, ShoppingCart, Star, Store, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const SIMILAR_PLACEHOLDERS = Array.from({ length: 5 });

// Paleta tipo Mercado Libre, solo para esta vista previa: sirve para que el
// vendedor vea su propia publicación parecido a como se verá en el
// marketplace. No se usa el logo ni ninguna marca de Mercado Libre, y estos
// colores viven solo en este archivo — el resto de la app usa los tokens de
// MeliBoost.
const ML = {
  yellow: "#FFE600",
  blue: "#3483FA",
  blueDark: "#2968C8",
  blueSoft: "#E7F0FF",
  green: "#00A650",
  pageBg: "#EBEBEB",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F5",
  line: "#EEEEEE",
  ink: "#333333",
  body: "#555555",
  mut: "#999999",
  mut2: "#666666",
  placeholder: "#E0E0E0",
};

export function MeliListingPreview({
  title,
  images,
  description,
  categoryName,
  device = "desktop",
}: {
  title: string;
  images: string[];
  description: string;
  categoryName?: string;
  device?: "desktop" | "mobile";
}) {
  const [mainIndex, setMainIndex] = useState(0);
  const mainImage = images[mainIndex];
  const isMobile = device === "mobile";

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Cabecera con barra de búsqueda genérica, sin logo ni marca */}
      <div className="px-3 py-2.5" style={{ background: ML.yellow }}>
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px]"
          style={{ background: ML.surface, color: ML.mut }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          Buscar productos, marcas y más...
        </div>
      </div>

      <div className="px-3 py-2.5" style={{ background: ML.surfaceAlt }}>
        <p className="px-1 text-[11px]" style={{ color: ML.mut2 }}>
          También puede interesarte
        </p>
        <div className="mt-1.5 flex gap-2 overflow-x-auto">
          {SIMILAR_PLACEHOLDERS.map((_, i) => (
            <div
              key={i}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md"
              style={{ background: ML.placeholder }}
            >
              <ImageIcon className="h-4 w-4" style={{ color: ML.mut }} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 p-3" style={{ background: ML.pageBg, color: ML.ink }}>
        <div className="flex items-center justify-between px-1 text-[12px]">
          {categoryName ? (
            <p className="flex items-center gap-1" style={{ color: ML.blue }}>
              Inicio <ChevronRight className="h-3 w-3" style={{ color: ML.mut }} /> {categoryName}
            </p>
          ) : (
            <span />
          )}
          <span style={{ color: ML.blue }}>Compartir</span>
        </div>

        <div className={cn("grid gap-2", !isMobile && "lg:grid-cols-[1fr_230px]")}>
          <div className="rounded-lg p-4" style={{ background: ML.surface }}>
            <div className={cn("flex gap-2", isMobile && "flex-col-reverse")}>
              {images.length > 1 && (
                <div
                  className={cn(
                    "flex gap-1.5",
                    isMobile ? "flex-row overflow-x-auto" : "max-h-[320px] flex-col overflow-y-auto",
                  )}
                >
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainIndex(i)}
                      className="h-11 w-11 shrink-0 overflow-hidden rounded-md border-2"
                      style={{ background: ML.surface, borderColor: i === mainIndex ? ML.blue : ML.line }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div
                className="flex aspect-square max-h-[380px] flex-1 items-center justify-center overflow-hidden rounded-lg"
                style={{ background: ML.surface }}
              >
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainImage} alt={title} className="h-full w-full object-contain" />
                ) : (
                  <Package className="h-10 w-10" style={{ color: "#CCCCCC" }} />
                )}
              </div>
            </div>

            <div className="mt-4 border-t pt-3" style={{ borderColor: ML.line }}>
              <p className="text-[13px]" style={{ color: ML.mut }}>
                Nuevo
              </p>
              <h2 className="mt-1 text-xl leading-tight font-normal" style={{ color: ML.ink }}>
                {title || "(sin título)"}
              </h2>
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: ML.surface }}>
            <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: ML.green }}>
              <Truck className="h-4 w-4 shrink-0" />
              Envío gratis a todo el país
            </p>
            <p className="mt-1 text-[12px]" style={{ color: ML.blue }}>
              Calcular cuándo llega
            </p>

            <div className="mt-3 flex items-center gap-2 border-t pt-3" style={{ borderColor: ML.line }}>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "#F0F0F0" }}
              >
                <Store className="h-3.5 w-3.5" style={{ color: ML.mut }} />
              </div>
              <p className="text-[12px]" style={{ color: ML.body }}>
                Vendido por{" "}
                <span className="font-medium" style={{ color: ML.ink }}>
                  Tu tienda
                </span>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: ML.line }}>
              <button
                type="button"
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-white"
                style={{ background: ML.blue }}
              >
                Comprar ahora
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold"
                style={{ background: ML.blueSoft, color: ML.blue }}
              >
                <ShoppingCart className="h-4 w-4" />
                Agregar al carrito
              </button>
            </div>

            <p className="mt-3 border-t pt-3 text-[11px]" style={{ borderColor: ML.line, color: ML.mut }}>
              Tarjetas, débito y efectivo
            </p>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: ML.surface }}>
          <p className="text-base font-semibold">Características principales</p>
          {categoryName ? (
            <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
              <span style={{ color: ML.mut }}>Categoría</span>
              <span>{categoryName}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm" style={{ color: ML.mut }}>
              Se completan al publicar en Mercado Libre.
            </p>
          )}
        </div>

        <div className="rounded-lg p-4" style={{ background: ML.surface }}>
          <p className="text-base font-semibold">Descripción</p>
          <p
            className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: ML.body }}
          >
            {description || "(sin descripción)"}
          </p>
        </div>

        {/* Publicación nueva: preguntas y opiniones usan su estado vacío real,
            no se inventan reseñas. */}
        <div className="rounded-lg p-4" style={{ background: ML.surface }}>
          <p className="flex items-center gap-2 text-base font-semibold">
            <MessageCircleQuestion className="h-4 w-4" style={{ color: ML.blue }} />
            Preguntas y respuestas
          </p>
          <div className="mt-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: ML.line, color: ML.mut }}>
            Escribí tu pregunta...
          </div>
          <p className="mt-3 text-sm" style={{ color: ML.mut }}>
            Todavía no hay preguntas. ¡Sé el primero en preguntar!
          </p>
        </div>

        <div className="rounded-lg p-4" style={{ background: ML.surface }}>
          <p className="flex items-center gap-2 text-base font-semibold">
            <Star className="h-4 w-4" style={{ color: ML.blue }} />
            Opiniones del producto
          </p>
          <p className="mt-2 text-sm" style={{ color: ML.mut }}>
            Este producto todavía no tiene opiniones.
          </p>
        </div>
      </div>
    </div>
  );
}
