"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Antes eran 2 TabsTrigger dentro de una sola página (estado de cliente,
// se perdía todo al recargar). Ahora son 3 páginas reales — este es el
// mismo look visual de TabsList/TabsTrigger (ver ui/tabs.tsx) pero hecho
// con <Link> para que cada paso tenga URL propia y el usuario pueda volver
// atrás/recargar sin perder nada.
const TABS = [
  { href: "/dashboard/publicaciones/seo", label: "Optimizador SEO" },
  { href: "/dashboard/publicaciones/descripcion", label: "Descripción" },
  { href: "/dashboard/publicaciones/imagenes", label: "Generador de Imágenes" },
  { href: "/dashboard/publicaciones/publicar", label: "Publicar" },
];

export function PublicacionesTabs() {
  const pathname = usePathname();

  return (
    <div className="mt-8 inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              isActive ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
