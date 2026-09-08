import Link from "next/link";
import { auth } from "@/auth";

// Con cuentas de mucho volumen, traer todas las órdenes/publicaciones de
// Mercado Libre puede tomar más de los 10s por defecto de Vercel.
export const maxDuration = 60;

import { prisma } from "@/lib/prisma";
import {
  debugProbeBillingAndAds,
  ensureFreshMeliToken,
  getItemsDetails,
  getMeliUser,
  getOrderStats,
  getSaleFee,
  getUserItemIds,
  type OrderStats,
} from "@/lib/meli-api";
import { Button } from "@/components/ui/button";
import { ProfitabilityTable, type ProfitabilityRow } from "@/components/dashboard/profitability-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RevenueSummary } from "@/components/dashboard/revenue-summary";
import { OperatingCostsManager } from "@/components/dashboard/operating-costs";
import { computePeriodProfit } from "@/lib/profitability";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const accessToken = await ensureFreshMeliToken(userId);

  if (!accessToken) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
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

  let rows: ProfitabilityRow[] = [];
  let errorMessage: string | null = null;
  let operatingCosts: { id: string; label: string; amount: number }[] = [];
  let taxWithholdingPercent = 0;
  let orderStats: Record<string, OrderStats> = {};

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { taxWithholdingPercent: true },
    });
    taxWithholdingPercent = user?.taxWithholdingPercent
      ? Number(user.taxWithholdingPercent)
      : 0;

    const costEntries = await prisma.costEntry.findMany({
      where: { userId, productId: null },
      orderBy: { createdAt: "asc" },
    });
    operatingCosts = costEntries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      amount: Number(entry.amount),
    }));

    const meliUser = await getMeliUser(accessToken);
    await debugProbeBillingAndAds(accessToken, meliUser.id);
    const itemIds = await getUserItemIds(accessToken, String(meliUser.id));
    const items = await getItemsDetails(accessToken, itemIds);
    orderStats = await getOrderStats(accessToken, meliUser.id, 30);

    rows = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.upsert({
          where: { userId_meliItemId: { userId, meliItemId: item.id } },
          update: { title: item.title, price: item.price },
          create: {
            userId,
            meliItemId: item.id,
            title: item.title,
            price: item.price,
          },
        });

        const saleFee = await getSaleFee(
          accessToken,
          meliUser.site_id,
          item.price,
          item.category_id,
          item.listing_type_id,
        );

        const stats = orderStats[item.id] ?? { quantity: 0, revenue: 0, commission: 0, shipping: 0 };

        return {
          productId: product.id,
          title: item.title,
          thumbnail: item.thumbnail,
          permalink: item.permalink,
          price: item.price,
          currencyId: item.currency_id,
          availableQuantity: item.available_quantity,
          saleFee: saleFee ?? 0,
          cogs: product.cogs ? Number(product.cogs) : 0,
          unitsSold30d: stats.quantity,
          revenue30d: stats.revenue,
          commission30d: stats.commission,
          shipping30d: stats.shipping,
        } satisfies ProfitabilityRow;
      }),
    );
  } catch (err) {
    console.error("Dashboard Mercado Libre fetch failed:", err);
    errorMessage =
      "No pudimos traer tus publicaciones de Mercado Libre en este momento. Intenta de nuevo en unos minutos.";
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold">Rentabilidad de tus publicaciones</h1>
      <p className="mt-1 text-muted-foreground">
        Ingresos, comisión y costo de envío vienen directo de Mercado Libre
        (datos reales de cada venta, no estimaciones). Solo ingresa el costo
        de tu producto.
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
        <>
          {(() => {
            const margins = rows.map((row) =>
              computePeriodProfit({
                ...row,
                unitsSold: row.unitsSold30d,
                revenue: row.revenue30d,
                commission: row.commission30d,
                shipping: row.shipping30d,
                taxWithholdingPercent,
              }),
            );
            const totalNetProfit = margins.reduce((sum, m) => sum + m.netProfit, 0);
            const killers = margins.filter((m) => m.margin >= 30).length;
            const regulares = margins.filter((m) => m.margin >= 15 && m.margin < 30).length;
            const criticos = margins.filter((m) => m.margin < 15).length;

            // Ventas/unidades/comisión/envío: de TODAS las órdenes reales
            // del periodo, incluyendo publicaciones pausadas/cerradas que ya
            // no están en `rows` (que solo trae publicaciones activas).
            const allOrderStats = Object.values(orderStats);
            const totalRevenue = allOrderStats.reduce((sum, s) => sum + s.revenue, 0);
            const totalUnits = allOrderStats.reduce((sum, s) => sum + s.quantity, 0);
            const totalCommission = allOrderStats.reduce((sum, s) => sum + s.commission, 0);
            const totalShipping = allOrderStats.reduce((sum, s) => sum + s.shipping, 0);
            // COGS solo se conoce para publicaciones activas con costo asignado.
            const totalCogs = rows.reduce((sum, r) => sum + r.cogs * r.unitsSold30d, 0);
            const totalOperatingCosts = operatingCosts.reduce((sum, c) => sum + c.amount, 0);

            return (
              <>
                <div className="mt-8">
                  <RevenueSummary
                    currencyId={rows[0].currencyId}
                    totalRevenue={totalRevenue}
                    totalUnits={totalUnits}
                    totalCommission={totalCommission}
                    totalShipping={totalShipping}
                    totalCogs={totalCogs}
                    totalOperatingCosts={totalOperatingCosts}
                    taxWithholdingPercent={taxWithholdingPercent}
                  />
                </div>

                <div className="mt-8">
                  <OperatingCostsManager
                    currencyId={rows[0].currencyId}
                    costs={operatingCosts}
                    taxWithholdingPercent={taxWithholdingPercent}
                  />
                </div>

                <div className="mt-8">
                  <SummaryCards
                    totalNetProfit={totalNetProfit}
                    currencyId={rows[0].currencyId}
                    killers={killers}
                    regulares={regulares}
                    criticos={criticos}
                    withCost={rows.filter((row) => row.cogs > 0).length}
                    totalProducts={rows.length}
                  />
                </div>
              </>
            );
          })()}

          <div className="mt-8">
            <ProfitabilityTable rows={rows} taxWithholdingPercent={taxWithholdingPercent} />
          </div>
        </>
      )}
    </div>
  );
}
