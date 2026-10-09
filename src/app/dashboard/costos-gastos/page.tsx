import Link from "next/link";
import { auth } from "@/auth";

// Igual que Rentabilidad, esto trae publicaciones/órdenes reales de
// Mercado Libre y puede tardar más de los 10s por defecto de Vercel.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { CostsExpensesSection } from "@/components/dashboard/costs-expenses";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";
import { getRentabilidadData } from "@/lib/dashboard-data";

export default async function CostosGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;

  const { tab } = await searchParams;
  const data = await getRentabilidadData(userId);

  if (!data.connected) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[22px] border border-border bg-card px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Todavía no conectaste tu cuenta de Mercado Libre
        </h1>
        <p className="max-w-md text-muted-foreground">
          Necesitamos acceso a tus publicaciones para calcular tus costos y gastos reales.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  const { rows, errorMessage, operatingCosts, autoExpenses, taxEntries, billingSummary, siteId } = data;

  return (
    <>
      <DashboardTitleBar title="Gestión de Costos" subtitle="Gastos operativos y costos de producto (COGS)." />

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
        <CostsExpensesSection
          currencyId={rows[0].currencyId}
          products={rows.map((row) => ({
            productId: row.productId,
            meliItemId: row.meliItemId,
            title: row.title,
            thumbnail: row.thumbnail,
            price: row.price,
            cogs: row.cogs,
            categoryId: row.categoryId,
            listingTypeId: row.listingTypeId,
          }))}
          operatingCosts={operatingCosts}
          autoExpenses={autoExpenses}
          taxEntries={taxEntries}
          billingSummary={billingSummary}
          siteId={siteId}
          initialTab={tab}
        />
      )}
    </>
  );
}
