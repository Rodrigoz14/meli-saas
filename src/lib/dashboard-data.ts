import { prisma } from "@/lib/prisma";
import {
  ensureFreshMeliToken,
  getBillingData,
  getItemsDetails,
  getMeliUser,
  getOrderStats,
  getSaleFee,
  getUserItemIds,
  type BillingSummary,
  type OrderStats,
} from "@/lib/meli-api";
import type { ProfitabilityRow } from "@/components/dashboard/profitability-table";

export type OperatingCostEntry = {
  id: string;
  label: string;
  amount: number;
  category: string;
  isFixed: boolean;
  source?: "ml";
};

// Grupos de la factura real de ML que representan gastos operativos que hoy
// no se capturan en ningún otro lado (a diferencia de "Cargos por venta" y
// "Cargos por envíos", que ya se calculan por orden en Rentabilidad — si los
// sumáramos también aquí, se contarían dos veces). "Publicidad" queda afuera
// a propósito: tiene su propia métrica en Rentabilidad (como "Inversión en
// Publicidad"), igual que Comisión/Envío, en vez de mezclarse con Gastos
// Operativos.
const AUTO_EXPENSE_GROUPS: Record<string, { category: string; isFixed: boolean }> = {
  "Cargos especiales": { category: "Servicios", isFixed: false },
  "Cargos de envíos full": { category: "Otros", isFixed: false },
  "Cargos de eShop": { category: "Servicios", isFixed: true },
};

function buildAutoOperatingCosts(summary: BillingSummary | null): OperatingCostEntry[] {
  if (!summary) return [];
  return summary.charges
    .filter((c) => c.group in AUTO_EXPENSE_GROUPS)
    .map((c, i) => {
      const meta = AUTO_EXPENSE_GROUPS[c.group];
      return {
        id: `ml-${summary.periodFrom}-${i}`,
        label: `${c.label} (ML)`,
        amount: c.amount,
        category: meta.category,
        isFixed: meta.isFixed,
        source: "ml" as const,
      };
    });
}

export type TaxEntry = { id: string; label: string; percent: number };

export type RentabilidadData =
  | { connected: false }
  | {
      connected: true;
      errorMessage: string | null;
      rows: ProfitabilityRow[];
      operatingCosts: OperatingCostEntry[];
      taxEntries: TaxEntry[];
      taxWithholdingPercent: number;
      orderStats: Record<string, OrderStats>;
      billingSummary: BillingSummary | null;
      totalAds: number;
    };

// Compartido entre /dashboard (Rentabilidad) y /dashboard/costos-gastos —
// ambos necesitan lo mismo (publicaciones reales de Mercado Libre + costos
// definidos por el usuario), así que la llamada en vivo a la API vive en un
// solo lugar en vez de duplicarse entre las dos páginas.
export async function getRentabilidadData(userId: string): Promise<RentabilidadData> {
  const accessToken = await ensureFreshMeliToken(userId);
  if (!accessToken) return { connected: false };

  let rows: ProfitabilityRow[] = [];
  let errorMessage: string | null = null;
  let operatingCosts: OperatingCostEntry[] = [];
  let taxEntries: TaxEntry[] = [];
  let taxWithholdingPercent = 0;
  let orderStats: Record<string, OrderStats> = {};
  let billingSummary: BillingSummary | null = null;
  let totalAds = 0;

  try {
    const [costEntries, taxEntryRows] = await Promise.all([
      prisma.costEntry.findMany({
        where: { userId, productId: null },
        orderBy: { createdAt: "asc" },
      }),
      prisma.taxEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    operatingCosts = costEntries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      amount: Number(entry.amount),
      category: entry.category,
      isFixed: entry.isFixed,
    }));
    taxEntries = taxEntryRows.map((entry) => ({
      id: entry.id,
      label: entry.label,
      percent: Number(entry.percent),
    }));
    // Suma de todos los impuestos con nombre (IVA, Renta, etc.) — la
    // retención "% sobre ventas" que usa toda la cuenta de rentabilidad
    // sigue siendo un solo número, solo que ahora se compone de varias
    // entradas nombradas en vez de un único campo en User.
    taxWithholdingPercent = taxEntries.reduce((sum, t) => sum + t.percent, 0);

    const meliUser = await getMeliUser(accessToken);
    const billingData = await getBillingData(accessToken, 30);
    billingSummary = billingData.closedSummary;
    totalAds = billingData.rollingAdsSpend ?? 0;
    operatingCosts = [...buildAutoOperatingCosts(billingSummary), ...operatingCosts];
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
          meliItemId: product.meliItemId,
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

  return {
    connected: true,
    errorMessage,
    rows,
    operatingCosts,
    taxEntries,
    taxWithholdingPercent,
    orderStats,
    billingSummary,
    totalAds,
  };
}
