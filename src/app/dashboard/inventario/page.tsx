import Link from "next/link";
import { auth } from "@/auth";

// Comparte los mismos datos que Rentabilidad/Costos y gastos (cacheados 60s
// en getRentabilidadData), así que en la práctica esta página casi nunca
// dispara la llamada en vivo completa — pero puede tardar igual que ellas
// en un cache-miss.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { InventorySection } from "@/components/dashboard/inventory-section";
import { getRentabilidadData } from "@/lib/dashboard-data";

export default async function InventarioPage() {
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
          Necesitamos acceso a tus publicaciones para calcular tu inventario real.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  const { rows, errorMessage } = data;

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Inventario</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Stock real de cada publicación y días restantes según tu velocidad de venta de los últimos 30 días.
      </p>

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
          <InventorySection
            products={rows.map((row) => ({
              productId: row.productId,
              meliItemId: row.meliItemId,
              title: row.title,
              thumbnail: row.thumbnail,
              permalink: row.permalink,
              availableQuantity: row.availableQuantity,
              unitsSold30d: row.unitsSold30d,
              cogs: row.cogs,
              price: row.price,
            }))}
            currencyId={rows[0].currencyId}
          />
        </div>
      )}
    </div>
  );
}
