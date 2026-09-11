import Link from "next/link";
import { auth } from "@/auth";

// Pide visitas por publicación (1 por llamada) para 2 períodos — puede
// tardar más que las demás páginas con catálogos grandes.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { getAnalyticsData } from "@/lib/analytics-data";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const { days: daysParam } = await searchParams;
  const days = [7, 15, 30].includes(Number(daysParam)) ? Number(daysParam) : 7;

  const data = await getAnalyticsData(userId, days);

  if (!data.connected) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Todavía no conectaste tu cuenta de Mercado Libre
        </h1>
        <p className="max-w-md text-muted-foreground">
          Necesitamos acceso a tus publicaciones para calcular tus métricas de Analytics.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Comparación de períodos, atribución de causas y publicaciones ganadoras/perdedoras.
      </p>

      {data.errorMessage && (
        <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {data.errorMessage}
        </p>
      )}

      {!data.errorMessage && data.items.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No encontramos publicaciones activas en tu cuenta de Mercado Libre.
        </p>
      )}

      {!data.errorMessage && data.items.length > 0 && (
        <div className="mt-8">
          <AnalyticsSection data={data} days={days} />
        </div>
      )}
    </div>
  );
}
