"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Boundary de error para todo /dashboard/* — sin esto, cualquier falla
// real (Mercado Libre caído, un timeout de la IA, un bug) mostraba la
// pantalla de error genérica y sin marca de Next.js en vez de algo
// prolijo con la opción de reintentar sin perder la sesión.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="font-display text-2xl font-bold">Algo salió mal</h1>
      <p className="max-w-md text-muted-foreground">
        No pudimos cargar esta sección. Puede ser un problema temporal con Mercado Libre o con nuestro servidor —
        intentá de nuevo en unos segundos.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>
          <RotateCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
        <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
          Volver al Dashboard
        </Button>
      </div>
    </div>
  );
}
