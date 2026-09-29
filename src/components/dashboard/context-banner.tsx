"use client";

import { Sparkles } from "lucide-react";
import { minutesAgo } from "@/lib/publication-context";

// Aviso "Usando datos de..." que ven Descripción e Imágenes cuando hay
// contexto guardado por una herramienta anterior (Optimizador SEO) —
// mismo patrón visual en las 2 páginas, con la opción de ignorarlo sin
// perder el contexto guardado (togglea el estado local del padre nomás).
export function ContextBanner({
  sourceLabel,
  summary,
  savedAt,
  onDismiss,
}: {
  sourceLabel: string;
  summary: string;
  savedAt: number;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Usando datos de {sourceLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summary} · hace {minutesAgo(savedAt)} min
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Cambiar a modo manual
      </button>
    </div>
  );
}
