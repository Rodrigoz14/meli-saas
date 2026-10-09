"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Antes eran 2 TabsTrigger dentro de una sola página (estado de cliente,
// se perdía todo al recargar). Ahora son 4 páginas reales con URL propia —
// se muestran como pasos numerados de un asistente.
const STEPS = [
  { href: "/dashboard/publicaciones/seo", label: "Optimizador SEO" },
  { href: "/dashboard/publicaciones/descripcion", label: "Descripción" },
  { href: "/dashboard/publicaciones/imagenes", label: "Generador de Imágenes" },
  { href: "/dashboard/publicaciones/publicar", label: "Publicar" },
];

export function PublicacionesTabs() {
  const pathname = usePathname();

  return (
    <div className="flex w-fit flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-1.5">
      {STEPS.map((step, index) => {
        const isActive = pathname === step.href;
        return (
          <Link
            key={step.href}
            href={step.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-gradient-to-r from-primary to-primary-2 text-primary-foreground shadow-[0_8px_22px_-8px_var(--glow)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                isActive ? "bg-white/20" : "bg-muted",
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </Link>
        );
      })}
    </div>
  );
}
