import { prisma } from "@/lib/prisma";
import {
  ensureFreshMeliToken,
  getAdsItemMetrics,
  getBestImageUrl,
  getBillingData,
  getEffectivePrices,
  getItemsDetails,
  getMeliUser,
  getOrderStats,
  getSaleFee,
  getUserItemIds,
  mapWithConcurrency,
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
      autoExpenses: OperatingCostEntry[];
      taxEntries: TaxEntry[];
      taxWithholdingPercent: number;
      orderStats: Record<string, OrderStats>;
      billingSummary: BillingSummary | null;
      totalAds: number;
      adsConnected: boolean;
      // site_id real de ML (MCO, MLA, MLM...) — lo necesita la calculadora de
      // precios para pedir la comisión real de una categoría a un precio
      // hipotético (getSaleFee).
      siteId: string;
      // Ventana de días real usada para ventas/ingresos/comisión/envío/Ads —
      // los nombres de campo en ProfitabilityRow (unitsSold30d, etc.) quedan
      // fijos por compatibilidad, pero el valor real depende de este `days`.
      days: number;
    };

// Compartido entre /dashboard (Rentabilidad) y /dashboard/costos-gastos —
// ambos necesitan lo mismo (publicaciones reales de Mercado Libre + costos
// definidos por el usuario), así que la llamada en vivo a la API vive en un
// solo lugar en vez de duplicarse entre las dos páginas. `days` es opcional
// (default 30) para no afectar a las páginas que todavía no exponen un
// selector de período (Costos y Gastos, Inventario, Publicaciones).
type SyncedProduct = { id: string; meliItemId: string; cogs: number };

// Deja en la base los productos que Mercado Libre reporta como activos y
// devuelve, por publicación, el id interno y el costo ya cargado. Hace como
// mucho tres consultas (leer, crear los nuevos, actualizar los que de verdad
// cambiaron) en vez de un upsert por publicación.
async function syncProducts(
  userId: string,
  items: { id: string; title: string; price: number }[],
  effectivePrices: Record<string, { price: number; originalPrice: number | null }>,
): Promise<Map<string, SyncedProduct>> {
  const priceOf = (item: { id: string; price: number }) => effectivePrices[item.id]?.price ?? item.price;

  const existing = await prisma.product.findMany({
    where: { userId, meliItemId: { in: items.map((item) => item.id) } },
    select: { id: true, meliItemId: true, title: true, price: true, cogs: true },
  });
  const existingByMeliId = new Map(existing.map((product) => [product.meliItemId, product]));

  const missing = items.filter((item) => !existingByMeliId.has(item.id));
  // Solo se escriben los que cambiaron de título o de precio: en una carga
  // normal eso es casi ninguno, así que la mayoría de las veces no se escribe
  // nada en la base.
  const changed = items.filter((item) => {
    const previous = existingByMeliId.get(item.id);
    return previous !== undefined && (previous.title !== item.title || Number(previous.price) !== priceOf(item));
  });

  if (missing.length > 0) {
    await prisma.product.createMany({
      data: missing.map((item) => ({
        userId,
        meliItemId: item.id,
        title: item.title,
        price: priceOf(item),
      })),
      skipDuplicates: true,
    });
  }

  if (changed.length > 0) {
    await prisma.$transaction(
      changed.map((item) =>
        prisma.product.update({
          where: { userId_meliItemId: { userId, meliItemId: item.id } },
          data: { title: item.title, price: priceOf(item) },
        }),
      ),
    );
  }

  const byMeliId = new Map<string, SyncedProduct>();
  // `meliItemId` es opcional en el modelo (un producto puede existir sin
  // publicación de Mercado Libre), pero acá solo interesan los que sí la
  // tienen — son los que vinieron de la API.
  const remember = (product: { id: string; meliItemId: string | null; cogs: unknown }) => {
    if (!product.meliItemId) return;
    byMeliId.set(product.meliItemId, {
      id: product.id,
      meliItemId: product.meliItemId,
      cogs: product.cogs ? Number(product.cogs) : 0,
    });
  };

  existing.forEach(remember);

  // Los recién creados se releen para conocer el id que generó la base.
  if (missing.length > 0) {
    const created = await prisma.product.findMany({
      where: { userId, meliItemId: { in: missing.map((item) => item.id) } },
      select: { id: true, meliItemId: true, cogs: true },
    });
    created.forEach(remember);
  }

  return byMeliId;
}

export async function getRentabilidadData(userId: string, days = 30): Promise<RentabilidadData> {
  const accessToken = await ensureFreshMeliToken(userId);
  if (!accessToken) return { connected: false };

  let rows: ProfitabilityRow[] = [];
  let errorMessage: string | null = null;
  let operatingCosts: OperatingCostEntry[] = [];
  let autoExpenses: OperatingCostEntry[] = [];
  let taxEntries: TaxEntry[] = [];
  let taxWithholdingPercent = 0;
  let orderStats: Record<string, OrderStats> = {};
  let billingSummary: BillingSummary | null = null;
  let totalAds = 0;
  let adsConnected = false;
  let siteId = "";

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
    siteId = meliUser.site_id;
    const adsTo = new Date();
    const adsFrom = new Date(adsTo.getTime() - days * 86400000);
    const [billingData, itemIds, adsMetrics] = await Promise.all([
      getBillingData(accessToken, days),
      getUserItemIds(accessToken, String(meliUser.id)),
      getAdsItemMetrics(accessToken, meliUser.site_id, adsFrom, adsTo),
    ]);
    billingSummary = billingData.closedSummary;
    totalAds = billingData.rollingAdsSpend ?? 0;
    adsConnected = adsMetrics !== null;
    autoExpenses = buildAutoOperatingCosts(billingSummary);
    const items = await getItemsDetails(accessToken, itemIds);
    const [effectivePrices, orderStatsResult] = await Promise.all([
      getEffectivePrices(accessToken, items.map((item) => ({ id: item.id, price: item.price }))),
      getOrderStats(accessToken, meliUser.id, days),
    ]);
    orderStats = orderStatsResult;

    // Sincroniza los productos en bloque en vez de un upsert por publicación.
    // Con ~76 publicaciones eso eran 76 viajes de ida y vuelta a la base
    // (serializados dentro de cada carril de concurrencia); así son 3 como
    // máximo, sin cambiar lo que queda guardado.
    const products = await syncProducts(userId, items, effectivePrices);

    const mapped = await mapWithConcurrency(items, 25, async (item): Promise<ProfitabilityRow | null> => {
        const effective = effectivePrices[item.id] ?? { price: item.price, originalPrice: item.original_price ?? null };
        const product = products.get(item.id);
        // No debería pasar (syncProducts crea los que falten), pero si la base
        // no devolvió esa fila es preferible omitir la publicación que tumbar
        // toda la pantalla.
        if (!product) return null;

        const saleFee = await getSaleFee(
          accessToken,
          meliUser.site_id,
          effective.price,
          item.category_id,
          item.listing_type_id,
        );

        const stats = orderStats[item.id] ?? { quantity: 0, revenue: 0, commission: 0, shipping: 0 };

        return {
          productId: product.id,
          meliItemId: product.meliItemId,
          title: item.title,
          thumbnail: getBestImageUrl(item),
          permalink: item.permalink,
          price: effective.price,
          originalPrice: effective.originalPrice,
          currencyId: item.currency_id,
          availableQuantity: item.available_quantity,
          logisticType: item.shipping?.logistic_type ?? null,
          saleFee: saleFee ?? 0,
          categoryId: item.category_id,
          listingTypeId: item.listing_type_id,
          cogs: product.cogs,
          unitsSold30d: stats.quantity,
          revenue30d: stats.revenue,
          commission30d: stats.commission,
          shipping30d: stats.shipping,
          ads: adsMetrics?.[item.id] ?? null,
        } satisfies ProfitabilityRow;
    });
    rows = mapped.filter((row): row is ProfitabilityRow => row !== null);
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
    autoExpenses,
    taxEntries,
    taxWithholdingPercent,
    orderStats,
    billingSummary,
    totalAds,
    adsConnected,
    siteId,
    days,
  };
}
