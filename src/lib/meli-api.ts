import { prisma } from "@/lib/prisma";

const MELI_API = "https://api.mercadolibre.com";

export type MeliItem = {
  id: string;
  title: string;
  price: number;
  // Precio antes del descuento activo — Mercado Libre lo manda en null si
  // la publicación no tiene ninguna oferta corriendo. `price` ya viene con
  // el descuento aplicado (coincide con lo que se ve en la publicación real),
  // esto es solo para poder mostrar que ES un precio de oferta.
  original_price: number | null;
  currency_id: string;
  thumbnail: string;
  // `thumbnail` es la versión chica (sufijo "-I", pensada para grillas de
  // búsqueda) — la misma respuesta ya trae la foto real en resolución
  // completa acá, sin ninguna llamada extra a la API.
  pictures?: { id?: string; url?: string; secure_url?: string }[];
  category_id: string;
  listing_type_id: string;
  available_quantity: number;
  status: string;
  permalink: string;
  // `logistic_type` ya venía en la respuesta de la API, solo faltaba
  // declararlo: "fulfillment" = la publicación está en FULL (bodega de
  // Mercado Libre), cualquier otro valor = despacha el vendedor.
  shipping?: { free_shipping?: boolean; logistic_type?: string };
};

// Mercado Libre manda `thumbnail` en baja resolución (sufijo "-I.jpg",
// pensado para grillas de búsqueda, no para mostrar el producto en grande) —
// por eso las fotos se veían borrosas en todos lados. `pictures[0]` es la
// MISMA foto en resolución real (hasta ~1200px), ya incluida en la misma
// respuesta de /items.
export function getBestImageUrl(item: MeliItem): string {
  return item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || item.thumbnail;
}

// Igual que meliFetchBilling: el 429 "local_rate_limited" es transitorio y
// se dispara con facilidad en cuentas de alto volumen (ej. /orders/search
// paginando cientos de páginas) — reintenta un par de veces con espera antes
// de darse por vencido, en vez de romper todo el Dashboard por un pico.
async function meliFetch<T>(path: string, accessToken: string, attempt = 0): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    return meliFetch<T>(path, accessToken, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

// Primera escritura real contra la API de Mercado Libre en este archivo
// (todo lo demás acá es GET) — mismo patrón de reintento que meliFetch; es
// seguro reintentar un 429 acá porque un PUT de título/descripción es
// idempotente (mandarlo 2 veces con el mismo valor da el mismo resultado
// final, no duplica nada). El body de error real de Mercado Libre se
// propaga tal cual (ej. "no se puede editar el título de una publicación
// con ventas") para que el usuario vea el motivo real, no un mensaje
// genérico.
async function meliFetchWrite<T>(
  path: string,
  accessToken: string,
  body: unknown,
  attempt = 0,
): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    return meliFetchWrite<T>(path, accessToken, body, attempt + 1);
  }
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(`Mercado Libre API ${path} -> ${res.status}: ${responseBody}`);
  }
  return res.json();
}

// PUT /items/{id} — el título es un campo directo del ítem. Mercado Libre
// puede rechazar el cambio (publicación con ventas, catalogada, etc.) con
// un error real que se propaga tal cual desde meliFetchWrite.
export async function updateItemTitle(accessToken: string, itemId: string, title: string): Promise<void> {
  await meliFetchWrite(`/items/${itemId}`, accessToken, { title });
}

// PUT /items/{id}/description — a diferencia del título, la descripción es
// un sub-recurso separado del ítem, no un campo de /items/{id}.
export async function updateItemDescription(accessToken: string, itemId: string, description: string): Promise<void> {
  await meliFetchWrite(`/items/${itemId}/description`, accessToken, { plain_text: description });
}

// POST /pictures/items/upload — sube el binario a Mercado Libre y
// devuelve su id real, todavía SIN asociar a ninguna publicación (subir
// sin asociar no toca ningún listado en vivo). Multipart, no JSON, por
// eso no pasa por meliFetchWrite.
export async function uploadPicture(accessToken: string, blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${MELI_API}/pictures/items/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre API /pictures/items/upload -> ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Mercado Libre no devolvió un id de imagen");
  return data.id;
}

// Mercado Libre reemplaza TODO el array de "pictures" en cada PUT a
// /items/{id} — para agregar sin borrar las fotos reales que ya tiene la
// publicación, hay que traerlas primero y remandarlas junto con las
// nuevas (nunca al revés, nunca solo las nuevas).
export async function appendItemPictures(accessToken: string, itemId: string, newPictureIds: string[]): Promise<void> {
  const [item] = await getItemsDetails(accessToken, [itemId]);
  const existingIds = (item?.pictures ?? []).map((p) => p.id).filter((id): id is string => Boolean(id));
  const pictures = [...existingIds, ...newPictureIds].map((id) => ({ id }));
  await meliFetchWrite(`/items/${itemId}`, accessToken, { pictures });
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
// El rate limit de la API de Facturación de ML es angosto y se dispara con
// facilidad cuando dos páginas piden datos de facturación casi al mismo
// tiempo (429 "local_rate_limited") — es transitorio, así que reintenta un
// par de veces con espera antes de darse por vencido.
async function meliFetchBilling<T>(path: string, accessToken: string, attempt = 0): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Api-Version": "2" },
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    return meliFetchBilling<T>(path, accessToken, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre Billing API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchBillingSummaryDetails(accessToken: string, periodKey: string): Promise<BillingSummary> {
  const details = await meliFetchBilling<MeliBillingSummaryDetails>(
    `/billing/integration/periods/key/${periodKey}/summary/details?group=ML&document_type=BILL&limit=100`,
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
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 86400000;
}

export type BillingData = {
  closedSummary: BillingSummary | null;
  rollingAdsSpend: number | null;
};

// Junta en una sola pasada lo que antes eran dos funciones separadas
// (factura del período cerrado + gasto de Ads en ventana móvil): ambas
// necesitaban la misma lista de períodos y, casi siempre, el mismo detalle
// del período cerrado — pedirlo dos veces duplicaba las llamadas a la API de
// Facturación de ML y terminaba disparando su rate limit (429) cuando se
// navegaba rápido entre Rentabilidad y Costos y Gastos, dejando la página
// sin datos. Acá cada período se pide como máximo una vez.
//
// Mercado Libre factura por ciclos de calendario (ej. 5 de un mes al 4 del
// siguiente), no por "últimos 30 días" — no hay un endpoint de métricas de
// Ads con ventana móvil accesible para esta app (probado, devuelve 404). Para
// aproximar una ventana real de últimos N días con datos 100% reales de la
// factura, se prorratea el gasto de cada ciclo de facturación que se solape
// con esa ventana, proporcional a cuántos días de ese ciclo caen dentro de
// ella — no es una estimación inventada, es la misma plata real repartida
// por día en vez de por ciclo calendario completo.
// La factura de un período no cambia de un minuto a otro, así que no vale la
// pena volver a pedirla cada vez que se navega entre Rentabilidad y Costos y
// Gastos dentro de la misma sesión — eso era justo lo que agotaba el rate
// limit de la API de Facturación de ML. Cache en memoria con TTL corto.
const billingCache = new Map<string, { data: BillingData; expiresAt: number }>();
const BILLING_CACHE_TTL_MS = 10 * 60 * 1000;

export async function getBillingData(accessToken: string, days = 30): Promise<BillingData> {
  const cacheKey = `${accessToken}:${days}`;
  const cached = billingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const result = await fetchBillingData(accessToken, days);
    billingCache.set(cacheKey, { data: result, expiresAt: Date.now() + BILLING_CACHE_TTL_MS });
    return result;
  } catch (err) {
    // No cachear un fallo total (ej. rate limit) — que la próxima carga
    // pueda reintentar en vez de quedarse 10 minutos sin datos.
    console.error("getBillingData failed:", err);
    return { closedSummary: null, rollingAdsSpend: null };
  }
}

async function fetchBillingData(accessToken: string, days: number): Promise<BillingData> {
  const periods = await meliFetchBilling<{ results: MeliBillingPeriod[] }>(
    "/billing/integration/monthly/periods?group=ML&document_type=BILL&limit=6",
    accessToken,
  );

  const closed = periods.results.find((p) => p.period_status === "CLOSED") ?? null;

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - days * 86400000);
  const overlapping = periods.results.filter((p) => {
    const from = new Date(p.period.date_from);
    const to = new Date(p.period.date_to);
    return from <= windowEnd && to >= windowStart;
  });

  // Un solo fetch por período distinto, aunque se use para ambas cosas.
  const keysToFetch = new Set<string>(overlapping.map((p) => p.key));
  if (closed) keysToFetch.add(closed.key);

  const detailsByKey = new Map<string, BillingSummary>();
  await Promise.all(
    [...keysToFetch].map(async (key) => {
      try {
        detailsByKey.set(key, await fetchBillingSummaryDetails(accessToken, key));
      } catch (err) {
        console.error(`fetchBillingSummaryDetails(${key}) failed:`, err);
      }
    }),
  );

  const closedSummary = closed ? (detailsByKey.get(closed.key) ?? null) : null;

  let rollingAdsSpend: number | null = null;
  if (overlapping.length > 0) {
    let total = 0;
    for (const period of overlapping) {
      const summary = detailsByKey.get(period.key);
      if (!summary) continue;
      const periodFrom = new Date(period.period.date_from);
      const periodTo = new Date(period.period.date_to);
      const periodLengthDays = Math.max(daysBetween(periodFrom, periodTo), 1);

      const overlapFrom = periodFrom > windowStart ? periodFrom : windowStart;
      const overlapTo = periodTo < windowEnd ? periodTo : windowEnd;
      const overlapDays = Math.max(daysBetween(overlapFrom, overlapTo), 0);

      const adsInPeriod = summary.charges
        .filter((c) => c.group === "Publicidad")
        .reduce((sum, c) => sum + c.amount, 0);

      total += adsInPeriod * (overlapDays / periodLengthDays);
    }
    rollingAdsSpend = Math.round(total);
  }

  return { closedSummary, rollingAdsSpend };
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

export type MeliUserProfile = {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  site_id: string;
  // URL pública real del perfil del vendedor en Mercado Libre — la usa
  // Configuración para el botón "Ver cuenta en Mercado Libre".
  permalink: string;
  seller_reputation: {
    level_id: string | null;
    power_seller_status: string | null;
  };
};

// Versión completa de /users/me para la página de Configuración — separada
// de getMeliUser (que solo trae lo mínimo que usan Dashboard/Analytics) para
// no cambiarle el tipo a todos esos call sites.
export function getMeliUserProfile(accessToken: string) {
  return meliFetch<MeliUserProfile>("/users/me", accessToken);
}

export type MeliTrendKeyword = { keyword: string; url: string };

// /trends/{site} (sin categoryId) trae las búsquedas más populares de TODO
// el sitio; con categoryId trae las más buscadas DENTRO de esa categoría
// (ej. para "audífonos" -> "airpods max", "audifonos jbl", etc.) — ambas
// variantes son reales de Mercado Libre, pero requieren el token del
// usuario (llamado sin sesión, Mercado Libre las bloquea con un 403 de
// PolicyAgent, por eso el Optimizador SEO las pide server-side con el
// token real de la cuenta conectada, no desde la extensión).
export async function getTrendingSearches(
  accessToken: string,
  siteId: string,
  categoryId?: string,
): Promise<MeliTrendKeyword[]> {
  const path = categoryId ? `/trends/${siteId}/${categoryId}` : `/trends/${siteId}`;
  return meliFetch<MeliTrendKeyword[]>(path, accessToken);
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

type MeliPriceEntry = {
  type: string;
  amount: number;
  regular_amount: number | null;
  conditions?: { start_time: string | null; end_time: string | null };
};

function isPriceEntryActive(entry: MeliPriceEntry, now: number): boolean {
  const start = entry.conditions?.start_time ? new Date(entry.conditions.start_time).getTime() : null;
  const end = entry.conditions?.end_time ? new Date(entry.conditions.end_time).getTime() : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

// El precio/original_price del endpoint /items (arriba) queda desactualizado
// en cuanto Mercado Libre corre una campaña con ventana de tiempo propia
// (ej. "Oferta", con start_time/end_time) — confirmado real: para un
// producto con una campaña activa, /items devolvía $32.760 mientras la
// publicación real ya mostraba $30.240 (el precio de la campaña vigente).
// Este endpoint dedicado SÍ tiene la campaña vigente con su ventana de
// fechas, así que es la fuente de verdad para el precio que el comprador
// ve hoy — se usa para pisar price/originalPrice de getItemsDetails.
async function getItemEffectivePrice(
  accessToken: string,
  itemId: string,
  fallbackPrice: number,
): Promise<{ price: number; originalPrice: number | null }> {
  try {
    const data = await meliFetch<{ prices: MeliPriceEntry[] }>(`/items/${itemId}/prices`, accessToken);
    const now = Date.now();
    const activePromos = (data.prices ?? []).filter(
      (p) => p.type === "promotion" && isPriceEntryActive(p, now),
    );
    if (activePromos.length > 0) {
      const best = activePromos.reduce((min, p) => (p.amount < min.amount ? p : min));
      return { price: best.amount, originalPrice: best.regular_amount ?? null };
    }
    const standard = (data.prices ?? []).find((p) => p.type === "standard");
    return { price: standard?.amount ?? fallbackPrice, originalPrice: null };
  } catch {
    return { price: fallbackPrice, originalPrice: null };
  }
}

// A diferencia de la comisión y del costo de envío, el precio efectivo SÍ
// puede cambiar en cualquier momento (una campaña que arranca o termina),
// así que la ventana es corta: lo justo para que navegar entre Dashboard,
// Rentabilidad y Analytics no vuelva a pedir los mismos 76 precios, sin
// llegar a mostrar un precio viejo.
const effectivePriceCache = new Map<string, { value: { price: number; originalPrice: number | null }; expiresAt: number }>();
const EFFECTIVE_PRICE_CACHE_TTL_MS = 3 * 60 * 1000;

export async function getEffectivePrices(
  accessToken: string,
  items: { id: string; price: number }[],
): Promise<Record<string, { price: number; originalPrice: number | null }>> {
  const now = Date.now();
  const results = await mapWithConcurrency(items, 25, async (item) => {
    const cached = effectivePriceCache.get(item.id);
    if (cached && cached.expiresAt > now) return cached.value;
    const value = await getItemEffectivePrice(accessToken, item.id, item.price);
    effectivePriceCache.set(item.id, { value, expiresAt: Date.now() + EFFECTIVE_PRICE_CACHE_TTL_MS });
    return value;
  });
  const byId: Record<string, { price: number; originalPrice: number | null }> = {};
  items.forEach((item, i) => {
    byId[item.id] = results[i];
  });
  return byId;
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
export async function mapWithConcurrency<T, R>(
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

// El costo de un envío ya despachado es un dato histórico: una vez que la
// orden está pagada, Mercado Libre no lo vuelve a tocar. Y es, de lejos, la
// llamada más repetida de toda la app — una cuenta activa tiene ~2.000 envíos
// en 30 días, y Dashboard, Analytics y Rentabilidad piden los mismos 2.000 en
// cada carga y en cada cambio de período. Medido en esta cuenta: 2.124
// llamadas = ~12s por pantalla. Cachearlos en memoria deja esas 12s en cero a
// partir de la segunda carga del proceso.
//
// Se cachea por id de envío (único en todo Mercado Libre) y solo el número de
// costo; nunca se usa un id que no haya venido de las órdenes del propio
// usuario que está consultando.
const shipmentCostCache = new Map<number, number>();
// Tope para que un proceso de larga vida no crezca sin límite: al llegar al
// máximo se descarta la mitad más vieja (Map itera en orden de inserción).
const SHIPMENT_COST_CACHE_MAX = 20000;

function rememberShipmentCost(shipmentId: number, cost: number) {
  if (shipmentCostCache.size >= SHIPMENT_COST_CACHE_MAX) {
    const toDrop = Math.floor(SHIPMENT_COST_CACHE_MAX / 2);
    let dropped = 0;
    for (const key of shipmentCostCache.keys()) {
      shipmentCostCache.delete(key);
      if (++dropped >= toDrop) break;
    }
  }
  shipmentCostCache.set(shipmentId, cost);
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
    const cost = data.senders?.reduce((sum, s) => sum + (s.cost ?? 0), 0) ?? 0;
    rememberShipmentCost(shipmentId, cost);
    return cost;
  } catch {
    // Un fallo no se cachea: que la próxima carga lo reintente en vez de
    // quedarse con un envío en 0 para siempre.
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
  range?: { from: Date; to: Date },
): Promise<Record<string, OrderStats>> {
  const from = range?.from ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  })();
  const to = range?.to ?? new Date();

  const pageSize = 50;
  const maxOrders = 5000; // tope de seguridad

  const baseParams = {
    seller: String(sellerId),
    "order.status": "paid",
    "order.date_created.from": from.toISOString(),
    "order.date_created.to": to.toISOString(),
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

  // Concurrencia limitada — sin esto, una cuenta con miles de órdenes en 30
  // días (offsets 0, 50, 100... hasta 1000+) disparaba decenas de requests
  // simultáneos a /orders/search y Mercado Libre respondía 429
  // "local_rate_limited", rompiendo el Dashboard entero.
  const restPages = await mapWithConcurrency(remainingOffsets, 10, (offset) => fetchPage(offset));
  const allOrders = [first, ...restPages].flatMap((page) => page.results);

  // Costo real de envío por embarque (no por publicación) — se pide aparte
  // porque no viene en la orden. Se piden con concurrencia limitada para no
  // saturar la API cuando hay miles de órdenes en el periodo.
  const shipmentIds = [
    ...new Set(
      allOrders.map((o) => o.shipping?.id).filter((id): id is number => Boolean(id)),
    ),
  ];
  // Solo se piden los que no estén cacheados ya (ver shipmentCostCache): al
  // navegar entre pantallas o cambiar el período, casi todos los envíos se
  // repiten y esto baja de ~2.000 llamadas a unas pocas decenas.
  const missingIds = shipmentIds.filter((id) => !shipmentCostCache.has(id));
  await mapWithConcurrency(missingIds, 25, (id) => getShipmentSellerCost(accessToken, id));
  const shipmentCosts = new Map(shipmentIds.map((id) => [id, shipmentCostCache.get(id) ?? 0]));

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

// Cuántos caracteres admite de verdad el título en esa categoría. NO es
// siempre 60: confirmado contra la cuenta real, "Suplementos Alimenticios"
// (MCO8830) y "Disfraces Completos" (MCO118203) admiten 150, mientras que
// "Glucómetros" (MCO166749) admite 60. Asumir 60 para todas desperdiciaba
// hasta 90 caracteres en las categorías amplias, que es justo lo contrario
// de lo que pide la regla 2 (completar todos los caracteres posibles).
//
// La configuración de una categoría casi no cambia, así que se cachea por
// un día. Si Mercado Libre no responde o no informa el campo, se devuelve
// null y el que llama decide el valor por defecto.
const categoryTitleLimitCache = new Map<string, { limit: number | null; expiresAt: number }>();
const CATEGORY_TITLE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCategoryMaxTitleLength(
  accessToken: string,
  categoryId: string,
): Promise<number | null> {
  const cached = categoryTitleLimitCache.get(categoryId);
  if (cached && cached.expiresAt > Date.now()) return cached.limit;

  try {
    const data = await meliFetch<{ settings?: { max_title_length?: number } }>(
      `/categories/${categoryId}`,
      accessToken,
    );
    const raw = data.settings?.max_title_length;
    const limit = typeof raw === "number" && raw > 0 ? raw : null;
    categoryTitleLimitCache.set(categoryId, { limit, expiresAt: Date.now() + CATEGORY_TITLE_LIMIT_TTL_MS });
    return limit;
  } catch (err) {
    console.error(`getCategoryMaxTitleLength(${categoryId}) failed:`, err);
    return null;
  }
}

export type CategoryTitleAttribute = {
  id: string;
  name: string;
  values: string[];
};

// Vocabulario propio de la categoria: los atributos con los que los
// compradores filtran ("Tipo de cama: almohadon/catre/colchoneta",
// "Tipos de cafetera: expreso/capsulas/de filtro"). Para un producto sin
// marca es el unico material legitimo que queda para llenar el titulo una
// vez que se descartan las marcas ajenas.
//
// El ruido se separa con las propias etiquetas de Mercado Libre, sin
// mantener ninguna lista a mano:
//  - hidden/read_only: datos administrativos (GTIN, IVA, medidas del
//    paquete, claves fiscales) que nadie busca.
//  - color: la regla 5 los prohibe en el titulo.
//  - number_unit y number: son especificaciones con unidad (voltaje, peso),
//    que la regla 4 deja fuera salvo que sean busqueda real.
//  - BRAND y MODEL: se tratan aparte, nunca se sugieren como "caracteristica".
const UNUSABLE_ATTRIBUTE_IDS = new Set(["BRAND", "MODEL", "PART_NUMBER", "GTIN", "SELLER_SKU"]);

function isUsableTitleAttribute(attr: {
  id: string;
  value_type?: string;
  tags?: Record<string, boolean>;
  values?: { name?: string }[];
}): boolean {
  if (UNUSABLE_ATTRIBUTE_IDS.has(attr.id)) return false;
  if (attr.id.includes("COLOR")) return false;
  const tags = attr.tags ?? {};
  if (tags.hidden || tags.read_only) return false;
  if (attr.value_type !== "string" && attr.value_type !== "list" && attr.value_type !== "boolean") return false;
  return (attr.values ?? []).some((v) => typeof v.name === "string" && v.name.trim().length > 0);
}

const categoryAttributesCache = new Map<string, { data: CategoryTitleAttribute[]; expiresAt: number }>();
const CATEGORY_ATTRIBUTES_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCategoryTitleAttributes(
  accessToken: string,
  categoryId: string,
): Promise<CategoryTitleAttribute[]> {
  const cached = categoryAttributesCache.get(categoryId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const raw = await meliFetch<
      {
        id: string;
        name: string;
        value_type?: string;
        tags?: Record<string, boolean>;
        values?: { name?: string }[];
      }[]
    >(`/categories/${categoryId}/attributes`, accessToken);

    const data = raw.filter(isUsableTitleAttribute).map((attr) => ({
      id: attr.id,
      name: attr.name,
      values: (attr.values ?? [])
        .map((v) => (v.name ?? "").trim())
        .filter(Boolean)
        // "Si"/"No" sueltos no describen nada en un titulo; para un atributo
        // booleano el que sirve es el nombre ("Es lavable" -> "lavable"),
        // asi que se resuelve abajo.
        .filter((name) => !/^(s[ií]|no)$/i.test(name))
        .slice(0, 12),
    }));

    // Los booleanos quedan sin valores utiles tras el filtro de Si/No: se
    // reemplazan por su propio nombre, que es lo que de verdad se escribe
    // en un titulo ("Es lavable" -> "Lavable").
    const normalized = data
      .map((attr) =>
        attr.values.length === 0
          ? {
              ...attr,
              values: [
                attr.name
                  // "Es lavable" -> "lavable"; "Es a prueba de agua" ->
                  // "prueba de agua". El conector inicial se quita porque
                  // la regla 3 lo marcaria como suelto en el titulo, y en
                  // un titulo de palabras clave no aporta ninguna busqueda.
                  .replace(/^(es|tiene|incluye)\s+/i, "")
                  .replace(/^(a|de|con|para|en|por|del|la|el|los|las)\s+/i, "")
                  .trim(),
              ],
            }
          : attr,
      )
      .filter((attr) => attr.values.some(Boolean));

    categoryAttributesCache.set(categoryId, { data: normalized, expiresAt: Date.now() + CATEGORY_ATTRIBUTES_TTL_MS });
    return normalized;
  } catch (err) {
    console.error(`getCategoryTitleAttributes(${categoryId}) failed:`, err);
    return [];
  }
}

// Comisión oficial de Mercado Libre para ese precio/categoría/tipo de
// publicación — el mismo cálculo que usa MercadoLibre internamente.
// La comisión de Mercado Libre es una tabla de tarifas por categoría y tipo
// de publicación: no cambia de un minuto a otro. Pero se pide una vez por
// publicación en cada carga (76 llamadas en esta cuenta), y las mismas
// combinaciones se repiten entre pantallas y entre cambios de período. Con
// una caché de unas horas, la segunda carga no paga ninguna.
const saleFeeCache = new Map<string, { fee: number | null; expiresAt: number }>();
const SALE_FEE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function getSaleFee(
  accessToken: string,
  siteId: string,
  price: number,
  categoryId: string,
  listingTypeId: string,
) {
  // El precio entra en la clave porque la comisión tiene tramos por monto;
  // se redondea al peso para que un centavo de diferencia no invalide la
  // entrada.
  const cacheKey = `${siteId}|${categoryId}|${listingTypeId}|${Math.round(price)}`;
  const cached = saleFeeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.fee;

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
    const fee = data.sale_fee_amount ?? null;
    saleFeeCache.set(cacheKey, { fee, expiresAt: Date.now() + SALE_FEE_CACHE_TTL_MS });
    return fee;
  } catch (err) {
    // Un fallo no se cachea, para que la próxima carga lo reintente.
    console.error(`getSaleFee(${categoryId}, price=${price}) failed:`, err);
    return null;
  }
}

// La API de Visitas solo admite UN item por llamada ("maximum amount of
// items to query is 1") — a diferencia de /items que acepta 20. Para
// Analytics necesitamos el período actual Y el anterior (misma duración),
// así que en vez de pedir /items/visits dos veces por producto se pide UNA
// vez el desglose diario de los últimos `days*2` días
// (/visits/time_window) y se parte localmente en dos mitades — la mitad de
// las llamadas a la API para el mismo dato.
async function getItemVisitsSplit(
  accessToken: string,
  itemId: string,
  days: number,
): Promise<{ current: number; previous: number }> {
  try {
    const data = await meliFetch<{ results?: { date: string; total: number }[] }>(
      `/items/${itemId}/visits/time_window?last=${days * 2}&unit=day`,
      accessToken,
    );
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);

    let current = 0;
    let previous = 0;
    for (const day of data.results ?? []) {
      if (new Date(day.date) >= cutoff) current += day.total;
      else previous += day.total;
    }
    return { current, previous };
  } catch {
    return { current: 0, previous: 0 };
  }
}

export async function getVisitsSplitForItems(
  accessToken: string,
  itemIds: string[],
  days: number,
): Promise<{ current: Record<string, number>; previous: Record<string, number> }> {
  const results = await mapWithConcurrency(itemIds, 25, (id) =>
    getItemVisitsSplit(accessToken, id, days),
  );
  const current: Record<string, number> = {};
  const previous: Record<string, number> = {};
  itemIds.forEach((id, i) => {
    current[id] = results[i].current;
    previous[id] = results[i].previous;
  });
  return { current, previous };
}

export type AdsItemMetric = {
  clicks: number;
  prints: number;
  cost: number;
  ctr: number; // % — clicks/prints, recalculado tras sumar (no se puede promediar el ctr de la API entre campañas)
  acos: number; // % — cost/totalAmount, recalculado tras sumar
  totalAmount: number;
  unitsQuantity: number;
};

// Encuentra el advertiser_id de Product Ads de esta cuenta, si tiene uno. No
// toda cuenta usa Ads — que no exista no es un error.
async function getAdvertiserId(accessToken: string, siteId: string): Promise<number | null> {
  try {
    const data = await meliFetch<{ advertisers?: { advertiser_id: number }[] }>(
      `/advertising/advertisers?product_id=PADS&site_id=${siteId}`,
      accessToken,
    );
    return data.advertisers?.[0]?.advertiser_id ?? null;
  } catch {
    return null;
  }
}

// La API de Product Ads vive en un microservicio distinto al resto (prefijo
// /marketplace/advertising/{site_id}/... en vez de /advertising/..., que da
// 404 aunque el token/scope sea válido) y exige el header Api-Version: 2.
async function meliFetchAds<T>(path: string, accessToken: string, attempt = 0): Promise<T> {
  const res = await fetch(`${MELI_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Api-Version": "2" },
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    return meliFetchAds<T>(path, accessToken, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Libre Ads API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

type MeliAdItem = {
  item_id: string;
  metrics?: {
    clicks?: number;
    prints?: number;
    cost?: number;
    total_amount?: number;
    units_quantity?: number;
  };
};

// Métricas reales de Ads (clics, impresiones, costo, CTR, ACOS, ventas
// atribuidas) por publicación, sumadas entre todas las campañas donde
// aparece esa publicación en el rango de fechas — vienen directo de la API
// de Product Ads de Mercado Libre, no son estimadas. Devuelve null si la
// cuenta no tiene Product Ads activo (no es un error, solo no hay datos).
export async function getAdsItemMetrics(
  accessToken: string,
  siteId: string,
  from: Date,
  to: Date,
): Promise<Record<string, AdsItemMetric> | null> {
  const advertiserId = await getAdvertiserId(accessToken, siteId);
  if (!advertiserId) return null;

  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = to.toISOString().slice(0, 10);
  const metricsParam = "clicks,prints,cost,total_amount,units_quantity";
  const pageSize = 100;
  const base = `/marketplace/advertising/${siteId}/advertisers/${advertiserId}/product_ads/ads/search`;
  const query = (offset: number) =>
    `${base}?date_from=${dateFrom}&date_to=${dateTo}&metrics=${metricsParam}&limit=${pageSize}&offset=${offset}`;

  try {
    const first = await meliFetchAds<{ paging: { total: number }; results: MeliAdItem[] }>(
      query(0),
      accessToken,
    );
    const remainingOffsets: number[] = [];
    for (let offset = pageSize; offset < first.paging.total; offset += pageSize) {
      remainingOffsets.push(offset);
    }
    // Mismo límite de concurrencia que /orders/search — evita el 429
    // "local_rate_limited" en cuentas con muchas campañas/anuncios activos.
    const restPages = await mapWithConcurrency(remainingOffsets, 10, (offset) =>
      meliFetchAds<{ results: MeliAdItem[] }>(query(offset), accessToken),
    );
    const allAds = [first, ...restPages].flatMap((page) => page.results);

    const totals: Record<string, AdsItemMetric> = {};
    for (const ad of allAds) {
      const m = ad.metrics;
      if (!m) continue;
      if (!totals[ad.item_id]) {
        totals[ad.item_id] = { clicks: 0, prints: 0, cost: 0, ctr: 0, acos: 0, totalAmount: 0, unitsQuantity: 0 };
      }
      const t = totals[ad.item_id];
      t.clicks += m.clicks ?? 0;
      t.prints += m.prints ?? 0;
      t.cost += m.cost ?? 0;
      t.totalAmount += m.total_amount ?? 0;
      t.unitsQuantity += m.units_quantity ?? 0;
    }
    for (const key in totals) {
      const t = totals[key];
      t.ctr = t.prints > 0 ? (t.clicks / t.prints) * 100 : 0;
      t.acos = t.totalAmount > 0 ? (t.cost / t.totalAmount) * 100 : 0;
    }
    return totals;
  } catch (err) {
    console.error("getAdsItemMetrics failed:", err);
    return null;
  }
}
