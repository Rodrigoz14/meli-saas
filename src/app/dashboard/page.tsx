import Link from "next/link";
import { auth } from "@/auth";

// Con cuentas de mucho volumen, traer todas las órdenes/publicaciones de
// Mercado Libre puede tomar más de los 10s por defecto de Vercel.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { RevenueSummary } from "@/components/dashboard/revenue-summary";
import { PeriodSelect } from "@/components/dashboard/period-select";
import { ExportSummaryButton } from "@/components/dashboard/export-summary-button";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";
import { computeRevenueSummary } from "@/lib/revenue-summary";
import { getRentabilidadData } from "@/lib/dashboard-data";

const PERIOD_OPTIONS = [7, 15, 30, 60, 90];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const { days: daysParam } = await searchParams;
  const days = PERIOD_OPTIONS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const data = await getRentabilidadData(userId, days);

  if (!data.connected) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[22px] border border-border bg-card px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Todavía no conectaste tu cuenta de Mercado Libre
        </h1>
        <p className="max-w-md text-muted-foreground">
          Necesitamos acceso a tus publicaciones para calcular tu rentabilidad real.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  const { rows, errorMessage, taxWithholdingPercent, orderStats, operatingCosts, autoExpenses, totalAds } = data;

  // Ventas/unidades/comisión/envío: de TODAS las órdenes reales del periodo,
  // incluyendo publicaciones pausadas/cerradas que ya no están en `rows`
  // (que solo trae publicaciones activas).
  const allOrderStats = Object.values(orderStats);
  const totalRevenue = allOrderStats.reduce((sum, s) => sum + s.revenue, 0);
  const totalUnits = allOrderStats.reduce((sum, s) => sum + s.quantity, 0);
  const totalCommission = allOrderStats.reduce((sum, s) => sum + s.commission, 0);
  const totalShipping = allOrderStats.reduce((sum, s) => sum + s.shipping, 0);
  // COGS solo se conoce para publicaciones activas con costo asignado.
  const totalCogs = rows.reduce((sum, r) => sum + r.cogs * r.unitsSold30d, 0);
  // Total costos operativos = lo que el usuario registra a mano + los cargos
  // reales que Mercado Libre ya facturó (Asesoría, Full, eShop) — aunque
  // estos últimos se muestren en su propia pestaña en Costos y Gastos, siguen
  // siendo plata real que hay que restar.
  const totalOperatingCosts =
    operatingCosts.reduce((sum, c) => sum + c.amount, 0) + autoExpenses.reduce((sum, c) => sum + c.amount, 0);

  const summary =
    rows.length > 0
      ? computeRevenueSummary({
          totalRevenue,
          totalUnits,
          totalCommission,
          totalShipping,
          totalCogs,
          totalOperatingCosts,
          totalAds,
          taxWithholdingPercent,
        })
      : null;

  return (
    <>
      <DashboardTitleBar
        title="Dashboard"
        subtitle="Ingresos, comisión y costo de envío vienen directo de Mercado Libre (datos reales de cada venta, no estimaciones). Solo ingresa el costo de tu producto."
        actions={
          <>
            <PeriodSelect days={days} />
            {summary && <ExportSummaryButton days={days} rows={summary.exportRows} />}
          </>
        }
      />

      {errorMessage && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </p>
      )}

      {!errorMessage && rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-4 text-muted-foreground">
          No encontramos publicaciones activas en tu cuenta de Mercado Libre.
        </p>
      )}

      {!errorMessage && rows.length > 0 && (
        <RevenueSummary
          days={days}
          currencyId={rows[0].currencyId}
          totalRevenue={totalRevenue}
          totalUnits={totalUnits}
          totalCommission={totalCommission}
          totalShipping={totalShipping}
          totalCogs={totalCogs}
          totalOperatingCosts={totalOperatingCosts}
          totalAds={totalAds}
          taxWithholdingPercent={taxWithholdingPercent}
        />
      )}
    </>
  );
}
