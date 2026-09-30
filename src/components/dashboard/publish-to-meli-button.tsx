"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PublishResult } from "@/app/dashboard/actions";

// A diferencia de "Copiar" (que no toca nada), esto escribe de verdad
// sobre la publicación real del usuario en Mercado Libre — por eso
// siempre pasa por una confirmación explícita en un modal antes de llamar
// a la action, y muestra el error REAL de Mercado Libre si lo rechaza
// (ej. título no editable por historial de ventas) en vez de un genérico.
export function PublishToMeliButton({
  label,
  content,
  permalink,
  publish,
}: {
  label: string;
  content: string;
  permalink: string;
  publish: (content: string) => Promise<PublishResult>;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setResult(null);
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        setResult(await publish(content));
      } catch {
        setResult({ ok: false, error: "No se pudo conectar con Mercado Libre, intentá de nuevo." });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Send className="h-3.5 w-3.5" />
        Publicar en Mercado Libre
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar {label} en Mercado Libre</DialogTitle>
          <DialogDescription>
            Esto escribe de verdad sobre tu publicación real en Mercado Libre — no se puede deshacer desde acá.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
          {content}
        </div>

        {result?.ok && (
          <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Publicado.{" "}
            <a href={permalink} target="_blank" rel="noreferrer" className="underline">
              Ver publicación real →
            </a>
          </p>
        )}
        {result && !result.ok && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {result.error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cerrar</DialogClose>
          {!result?.ok && (
            <Button type="button" onClick={handleConfirm} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPending ? "Publicando…" : "Sí, publicar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
