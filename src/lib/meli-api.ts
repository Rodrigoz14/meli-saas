import { prisma } from "@/lib/prisma";

const MELI_API = "https://api.mercadolibre.com";

export type MeliItem = {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  category_id: string;
  listing_type_id: string;
  available_quantity: number;
  status: string;
  permalink: string;
  shipping?: { free_shipping?: boolean };
};

async function meliFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

type MeliBillingPeriod = {
  key: string;
  amount: number;
  period: { date_from: string; date_to: string };
  period_status: "OPEN" | "CLOSED";
};

type MeliBillingChargeLine = { label: string; amount: number; type: string; group_description: string };

type MeliBillingSummaryDetails = {
  period: { date_from: string; date_to: string; key: string };
  bill_includes: {
    total_amount: number;
    total_perception: number;
    bonuses: MeliBillingChargeLine[];
    charges: MeliBillingChargeLine[];
  };
};

export type BillingSummary = {
  periodFrom: string;
  periodTo: string;
  totalAmount: number;
  totalPerception: number;
  charges: { label: string; amount: number; group: string }[];
  bonuses: { label: string; amount: number; group: string }[];
};

// Factura real y cerrada de Mercado Libre (ciclo de facturación oficial,
// no una ventana móvil de 30 días) — incluye cargos que la rentabilidad
// calculada por orden no captura (publicidad, asesoría comercial, Full,
// devoluciones) y las bonificaciones que Mercado Libre devuelve. Best-effort:
// si la cuenta no tiene historial de facturación todavía, devuelve null.
async function meliFetchBilling<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Api-Version": "2" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre Billing API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getLatestClosedBillingSummary(accessToken: string): Promise<BillingSummary | null> {
  try {
    const periods = await meliFetchBilling<{ results: MeliBillingPeriod[] }>(
      "/billing/integration/monthly/periods?group=ML&document_type=BILL&limit=6",
      accessToken,
    );
    const closed = periods.results.find((p) => p.period_status === "CLOSED");
    if (!closed) return null;

    const details = await meliFetchBilling<MeliBillingSummaryDetails>(
      `/billing/integration/periods/key/${closed.key}/summary/details?group=ML&document_type=BILL&limit=100`,
      accessToken,
    );

    return {
      periodFrom: details.period.date_from,
      periodTo: details.period.date_to,
      totalAmount: details.bill_includes.total_amount,
      totalPerception: details.bill_includes.total_perception,
      charges: details.bill_includes.charges.map((c) => ({
        label: c.label,
        amount: c.amount,
        group: c.group_description.trim(),
      })),
      bonuses: details.bill_includes.bonuses.map((c) => ({
        label: c.label,
        amount: c.amount,
        group: c.group_description.trim(),
      })),
    };
  } catch (err) {
    console.error("getLatestClosedBillingSummary failed:", err);
    return null;
  }
}

// Refresca el access_token si está vencido (o vence en menos de 1 minuto) y
// persiste el nuevo par de tokens. Devuelve null si el usuario no tiene una
// cuenta de Mercado Libre conectada.
export async function ensureFreshMeliToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "mercadolibre" },
  });
  if (!account?.access_token) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (account.expires_at && account.expires_at > nowSeconds + 60) {
    return account.access_token;
  }
  if (!account.refresh_token) return account.access_token;

  const res = await fetch(`${MELI_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MERCADOLIBRE_CLIENT_ID ?? "",
      client_secret: process.env.MERCADOLIBRE_CLIENT_SECRET ?? "",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new Error("No se pudo refrescar el token de Mercado Libre");
  }
  const data = await res.json();

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? account.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token as string;
}

export function getMeliUser(accessToken: string) {
  return meliFetch<{ id: number; nickname: string; site_id: string }>(
    "/users/me",
    accessToken,
  );
}

// Trae TODOS los ids de publicaciones activas, paginando (la API limita a
// 100 por página). Antes se cortaba en las primeras 20, lo que subestimaba
// las ventas reales de cualquier cuenta con más publicaciones.
export async function getUserItemIds(accessToken: string, meliUserId: string) {
  const ids: string[] = [];
  const pageSize = 100;
  let offset = 0;

  for (let page = 0; page < 10; page++) {
    const data = await meliFetch<{ results: string[]; paging: { total: number } }>(
      `/users/${meliUserId}/items/search?status=active&limit=${pageSize}&offset=${offset}`,
      accessToken,
    );
    ids.push(...data.results);
    offset += pageSize;
    if (offset >= data.paging.total || data.results.length === 0) break;
  }

  return ids;
}

// /items admite máximo 20 ids por llamada — se pagina en lotes.
export async function getItemsDetails(accessToken: string, ids: string[]) {
  if (ids.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 20) {
    batches.push(ids.slice(i, i + 20));
  }

  const results: MeliItem[] = [];
  for (const batch of batches) {
    const data = await meliFetch<{ body: MeliItem }[]>(
      `/items?ids=${batch.join(",")}`,
      accessToken,
    );
    results.push(...data.map((entry) => entry.body));
  }
  return results;
}

type MeliOrder = {
  order_items?: {
    item?: { id?: string };
    quantity?: number;
    unit_price?: number;
    sale_fee?: number;
  }[];
  shipping?: { id?: number };
};

// Ejecuta `fn` sobre `items` con un máximo de `limit` llamadas en paralelo a
// la vez, para no disparar cientos de requests simultáneos a Mercado Libre.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Costo real de envío que absorbe el vendedor por ese envío específico
// (después de descuentos obligatorios) — NO es lo mismo que
// payments[].shipping_cost, que es lo que pagó el comprador.
async function getShipmentSellerCost(accessToken: string, shipmentId: number) {
  try {
    const data = await meliFetch<{ senders?: { cost?: number }[] }>(
      `/shipments/${shipmentId}/costs`,
      accessToken,
    );
    return data.senders?.reduce((sum, s) => sum + (s.cost ?? 0), 0) ?? 0;
  } catch {
    return 0;
  }
}

export type OrderStats = {
  quantity: number;
  revenue: number;
  commission: number;
  shipping: number;
};

// Trae las órdenes pagadas de los últimos `days` días y suma, por
// publicación, unidades vendidas, ingresos reales (precio de cada venta, no
// el precio actual de la publicación — así se reflejan promociones o
// cambios de precio pasados) y la comisión real que cobró Mercado Libre en
// cada orden (no una estimación). Pagina hasta cubrir el total real de
// órdenes (una cuenta activa puede tener miles en 30 días).
export async function getOrderStats(
  accessToken: string,
  sellerId: number,
  days = 30,
): Promise<Record<string, OrderStats>> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const pageSize = 50;
  const maxOrders = 5000; // tope de seguridad

  const baseParams = {
    seller: String(sellerId),
    "order.status": "paid",
    "order.date_created.from": from.toISOString(),
    "order.date_created.to": new Date().toISOString(),
    sort: "date_desc",
    limit: String(pageSize),
  };

  const fetchPage = (offset: number) =>
    meliFetch<{ results: MeliOrder[]; paging: { total: number } }>(
      `/orders/search?${new URLSearchParams({ ...baseParams, offset: String(offset) })}`,
      accessToken,
    );

  // Primera página para saber cuántas órdenes hay en total, luego el resto
  // en paralelo (una cuenta activa puede tener miles en 30 días — pedirlas
  // una por una agotaría el tiempo límite de la función).
  const first = await fetchPage(0);
  const total = Math.min(first.paging.total, maxOrders);
  const remainingOffsets: number[] = [];
  for (let offset = pageSize; offset < total; offset += pageSize) {
    remainingOffsets.push(offset);
  }

  const restPages = await Promise.all(remainingOffsets.map((offset) => fetchPage(offset)));
  const allOrders = [first, ...restPages].flatMap((page) => page.results);

  // Costo real de envío por embarque (no por publicación) — se pide aparte
  // porque no viene en la orden. Se piden con concurrencia limitada para no
  // saturar la API cuando hay miles de órdenes en el periodo.
  const shipmentIds = [
    ...new Set(
      allOrders.map((o) => o.shipping?.id).filter((id): id is number => Boolean(id)),
    ),
  ];
  const shipmentCostsList = await mapWithConcurrency(shipmentIds, 25, (id) =>
    getShipmentSellerCost(accessToken, id),
  );
  const shipmentCosts = new Map(shipmentIds.map((id, i) => [id, shipmentCostsList[i]]));

  const totals: Record<string, OrderStats> = {};
  for (const order of allOrders) {
    const items = order.order_items ?? [];
    // El costo de envío viene a nivel del embarque, no por publicación — si
    // la orden tiene varios productos, se reparte a prorrata según el
    // ingreso de cada uno.
    const orderShippingCost = order.shipping?.id
      ? (shipmentCosts.get(order.shipping.id) ?? 0)
      : 0;
    const orderRevenue = items.reduce(
      (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 0),
      0,
    );

    for (const orderItem of items) {
      const id = orderItem.item?.id;
      if (!id) continue;
      const quantity = orderItem.quantity ?? 0;
      const revenue = (orderItem.unit_price ?? 0) * quantity;
      // sale_fee es por unidad (igual que unit_price) — hay que
      // multiplicarlo por la cantidad o se subestima la comisión en
      // cualquier orden con más de 1 unidad.
      const commission = (orderItem.sale_fee ?? 0) * quantity;
      const shipping =
        orderRevenue > 0
          ? orderShippingCost * (revenue / orderRevenue)
          : orderShippingCost / items.length;

      if (!totals[id]) totals[id] = { quantity: 0, revenue: 0, commission: 0, shipping: 0 };
      totals[id].commission += commission;
      totals[id].quantity += quantity;
      totals[id].revenue += revenue;
      totals[id].shipping += shipping;
    }
  }

  return totals;
}

// Comisión oficial de Mercado Libre para ese precio/categoría/tipo de
// publicación — el mismo cálculo que usa MercadoLibre internamente.
export async function getSaleFee(
  accessToken: string,
  siteId: string,
  price: number,
  categoryId: string,
  listingTypeId: string,
) {
  try {
    const params = new URLSearchParams({
      price: String(price),
      category_id: categoryId,
      listing_type_id: listingTypeId,
    });
    const data = await meliFetch<{ sale_fee_amount?: number }>(
      `/sites/${siteId}/listing_prices?${params.toString()}`,
      accessToken,
    );
    return data.sale_fee_amount ?? null;
  } catch (err) {
    console.error(`getSaleFee(${categoryId}, price=${price}) failed:`, err);
    return null;
  }
}
