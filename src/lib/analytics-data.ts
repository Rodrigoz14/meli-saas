import {
  ensureFreshMeliToken,
  getItemsDetails,
  getMeliUser,
  getOrderStats,
  getUserItemIds,
  getVisitsSplitForItems,
  type OrderStats,
} from "@/lib/meli-api";

export type ItemAnalytics = {
  productId: string;
  meliItemId: string;
  title: string;
  thumbnail: string;
  permalink: string;
  currencyId: string;
  availableQuantity: number;
  revenueNow: number;
  revenuePrev: number;
  unitsNow: number;
  unitsPrev: number;
  visitsNow: number;
  visitsPrev: number;
};

export type PeriodTotals = {
  revenue: number;
  units: number;
  visits: number;
  conversion: number; // 0-1
  avgTicket: number;
};

export type ImpactBreakdown = {
  visits: number;
  conversion: number;
  avgTicket: number;
};

export type AnalyticsData =
  | { connected: false }
  | {
      connected: true;
      errorMessage: string | null;
      currencyId: string;
      days: number;
      periodFrom: Date;
      periodTo: Date;
      prevFrom: Date;
      prevTo: Date;
      now: PeriodTotals;
      prev: PeriodTotals;
      impact: ImpactBreakdown;
      items: ItemAnalytics[];
    };

function periodTotals(revenue: number, units: number, visits: number): PeriodTotals {
  return {
    revenue,
    units,
    visits,
    conversion: visits > 0 ? units / visits : 0,
    avgTicket: units > 0 ? revenue / units : 0,
  };
}

// Descomposición secuencial del cambio de ingresos entre dos períodos en sus
// 3 factores multiplicativos (Ingresos = Visitas × Conversión × Ticket
// Promedio). Cada efecto se mide manteniendo los factores ya "consumidos" en
// su valor actual y los que faltan en su valor anterior — así los 3 efectos
// suman exacto la diferencia total de ingresos, sin residuo.
function computeImpact(now: PeriodTotals, prev: PeriodTotals): ImpactBreakdown {
  const visitsEffect = (now.visits - prev.visits) * prev.conversion * prev.avgTicket;
  const conversionEffect = now.visits * (now.conversion - prev.conversion) * prev.avgTicket;
  const avgTicketEffect = now.visits * now.conversion * (now.avgTicket - prev.avgTicket);
  return { visits: visitsEffect, conversion: conversionEffect, avgTicket: avgTicketEffect };
}

// Compartido por /dashboard/analytics — es una consulta pesada aparte de
// getRentabilidadData (pide visitas por publicación, que la API de ML solo
// permite de a una) así que vive en su propio fetch, no se mezcla con las
// demás páginas para no hacerlas más lentas.
export async function getAnalyticsData(userId: string, days = 7): Promise<AnalyticsData> {
  const accessToken = await ensureFreshMeliToken(userId);
  if (!accessToken) return { connected: false };

  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - days * 86400000);
  const prevTo = periodFrom;
  const prevFrom = new Date(prevTo.getTime() - days * 86400000);

  let errorMessage: string | null = null;
  let currencyId = "COP";
  let items: ItemAnalytics[] = [];
  let nowTotals = periodTotals(0, 0, 0);
  let prevTotals = periodTotals(0, 0, 0);

  try {
    const meliUser = await getMeliUser(accessToken);
    const itemIds = await getUserItemIds(accessToken, String(meliUser.id));
    const itemDetails = await getItemsDetails(accessToken, itemIds);
    if (itemDetails.length > 0) currencyId = itemDetails[0].currency_id;

    const [statsNow, statsPrev, visits] = await Promise.all([
      getOrderStats(accessToken, meliUser.id, days, { from: periodFrom, to: periodTo }),
      getOrderStats(accessToken, meliUser.id, days, { from: prevFrom, to: prevTo }),
      getVisitsSplitForItems(accessToken, itemIds, days),
    ]);
    const { current: visitsNow, previous: visitsPrev } = visits;

    items = itemDetails.map((item) => {
      const now: OrderStats = statsNow[item.id] ?? { quantity: 0, revenue: 0, commission: 0, shipping: 0 };
      const prev: OrderStats = statsPrev[item.id] ?? { quantity: 0, revenue: 0, commission: 0, shipping: 0 };
      return {
        productId: item.id,
        meliItemId: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        permalink: item.permalink,
        currencyId: item.currency_id,
        availableQuantity: item.available_quantity,
        revenueNow: now.revenue,
        revenuePrev: prev.revenue,
        unitsNow: now.quantity,
        unitsPrev: prev.quantity,
        visitsNow: visitsNow[item.id] ?? 0,
        visitsPrev: visitsPrev[item.id] ?? 0,
      } satisfies ItemAnalytics;
    });

    const totalRevenueNow = items.reduce((sum, i) => sum + i.revenueNow, 0);
    const totalUnitsNow = items.reduce((sum, i) => sum + i.unitsNow, 0);
    const totalVisitsNow = items.reduce((sum, i) => sum + i.visitsNow, 0);
    const totalRevenuePrev = items.reduce((sum, i) => sum + i.revenuePrev, 0);
    const totalUnitsPrev = items.reduce((sum, i) => sum + i.unitsPrev, 0);
    const totalVisitsPrev = items.reduce((sum, i) => sum + i.visitsPrev, 0);

    nowTotals = periodTotals(totalRevenueNow, totalUnitsNow, totalVisitsNow);
    prevTotals = periodTotals(totalRevenuePrev, totalUnitsPrev, totalVisitsPrev);
  } catch (err) {
    console.error("getAnalyticsData failed:", err);
    errorMessage = "No pudimos traer tus métricas de Mercado Libre en este momento. Intenta de nuevo en unos minutos.";
  }

  return {
    connected: true,
    errorMessage,
    currencyId,
    days,
    periodFrom,
    periodTo,
    prevFrom,
    prevTo,
    now: nowTotals,
    prev: prevTotals,
    impact: computeImpact(nowTotals, prevTotals),
    items,
  };
}
