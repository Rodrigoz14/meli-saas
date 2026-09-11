import Link from "next/link";
import { auth } from "@/auth";

// Igual que Rentabilidad, esto trae publicaciones/órdenes reales de
// Mercado Libre y puede tardar más de los 10s por defecto de Vercel.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { CostsExpensesSection } from "@/components/dashboard/costs-expenses";
import { getRentabilidadData } from "@/lib/dashboard-data";

export default async function CostosGastosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);

  if (!data.connected) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
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

  const { rows, errorMessage, operatingCosts, autoExpenses, taxEntries, billingSummary } = data;

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Gestión de Costos</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Gastos operativos y costos de producto (COGS).</p>

      {errorMessage && (
        <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </p>
      )}

      {!errorMessage && rows.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No encontramos publicaciones activas en tu cuenta de Mercado Libre.
        </p>
      )}

      {!errorMessage && rows.length > 0 && (
        <div className="mt-8">
          <CostsExpensesSection
            currencyId={rows[0].currencyId}
            products={rows.map((row) => ({
              productId: row.productId,
              meliItemId: row.meliItemId,
              title: row.title,
              thumbnail: row.thumbnail,
              price: row.price,
              cogs: row.cogs,
            }))}
            operatingCosts={operatingCosts}
            autoExpenses={autoExpenses}
            taxEntries={taxEntries}
            billingSummary={billingSummary}
          />
        </div>
      )}
    </div>
  );
}
