import Link from "next/link";
import { auth } from "@/auth";

// Pide visitas por publicación (1 por llamada) para 2 períodos — puede
// tardar más que las demás páginas con catálogos grandes.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";
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
      <div className="flex flex-col items-center gap-4 rounded-[22px] border border-border bg-card px-6 py-24 text-center">
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
    <>
      <DashboardTitleBar
        title="Analytics"
        subtitle="Comparación de períodos, atribución de causas y publicaciones ganadoras/perdedoras."
      />

      {data.errorMessage && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {data.errorMessage}
        </p>
      )}

      {!data.errorMessage && data.items.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-4 text-muted-foreground">
          No encontramos publicaciones activas en tu cuenta de Mercado Libre.
        </p>
      )}

      {!data.errorMessage && data.items.length > 0 && <AnalyticsSection data={data} days={days} />}
    </>
  );
}
