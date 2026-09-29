"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  filterRelevantKeywords,
  generateDetailedDescription,
  generateInfographicSetClaims,
  generateSearchTerms,
  generateSeoTitles,
  suggestAccentColor,
  type DetailedDescriptionInput,
  type InfographicClaim,
} from "@/lib/ai";
import { ensureFreshMeliToken, getSaleFee, getTrendingSearches } from "@/lib/meli-api";
import { discoverCategory, getCategoryName } from "@/lib/meli-public-api";
import { isAllowedImageHost, resolveImageDataUrl } from "@/lib/infographic-set";

// Rentabilidad y Costos y gastos son páginas distintas pero comparten los
// mismos datos (ver getRentabilidadData) — cualquier cambio hecho desde
// cualquiera de las dos tiene que invalidar ambas, o la otra se queda con
// datos viejos hasta un refresh manual.
function revalidateDashboards() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/costos-gastos");
}

export async function updateProductCosts(productId: string, cogs: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.product.update({
    where: { id: productId, userId: session.user.id },
    data: { cogs },
  });

  revalidateDashboards();
}

// Carga masiva desde la plantilla CSV — actualiza el COGS de cada producto
// que exista para este usuario con ese meliItemId. Ids que no coincidan con
// ninguna publicación propia se ignoran en silencio (el usuario ve cuántas
// filas sí se aplicaron desde el cliente).
export async function bulkUpdateProductCosts(entries: { meliItemId: string; cogs: number }[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  let updated = 0;
  for (const entry of entries) {
    if (!entry.meliItemId || !Number.isFinite(entry.cogs)) continue;
    const result = await prisma.product.updateMany({
      where: { userId: session.user.id, meliItemId: entry.meliItemId },
      data: { cogs: entry.cogs },
    });
    updated += result.count;
  }

  revalidateDashboards();
  return { updated };
}

// Gastos operativos propios del negocio (nómina, empaque, etc.) — no vienen
// de Mercado Libre, los define el usuario. `isFixed` distingue Fijo
// (mensual, recurrente) de Variable (puntual); `category` agrupa el
// desglose por categoría.
export async function addOperatingCost(label: string, amount: number, category: string, isFixed: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || amount <= 0) return null;

  const entry = await prisma.costEntry.create({
    data: {
      userId: session.user.id,
      label: label.trim(),
      amount,
      isFixed,
      category: category.trim() || "Otros",
    },
  });

  revalidateDashboards();
  return { id: entry.id, label: entry.label, amount: Number(entry.amount), category: entry.category, isFixed: entry.isFixed };
}

export async function bulkAddOperatingCosts(
  entries: { label: string; amount: number; category: string; isFixed: boolean }[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const valid = entries.filter((e) => e.label.trim() && e.amount > 0);
  if (valid.length === 0) return { added: 0 };

  await prisma.costEntry.createMany({
    data: valid.map((e) => ({
      userId: session.user!.id,
      label: e.label.trim(),
      amount: e.amount,
      isFixed: e.isFixed,
      category: e.category.trim() || "Otros",
    })),
  });

  revalidateDashboards();
  return { added: valid.length };
}

export async function updateOperatingCost(
  costEntryId: string,
  label: string,
  amount: number,
  category: string,
  isFixed: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || amount <= 0) return null;

  const entry = await prisma.costEntry.updateMany({
    where: { id: costEntryId, userId: session.user.id },
    data: { label: label.trim(), amount, isFixed, category: category.trim() || "Otros" },
  });
  if (entry.count === 0) return null;

  revalidateDashboards();
  return { id: costEntryId, label: label.trim(), amount, category: category.trim() || "Otros", isFixed };
}

export async function deleteOperatingCost(costEntryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.costEntry.deleteMany({
    where: { id: costEntryId, userId: session.user.id },
  });

  revalidateDashboards();
}

// Impuestos/retenciones con nombre propio (IVA, Renta, retención...) — se
// suman entre sí para el % total que se descuenta de las ventas.
export async function addTaxEntry(label: string, percent: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || percent <= 0) return null;

  const entry = await prisma.taxEntry.create({
    data: { userId: session.user.id, label: label.trim(), percent },
  });

  revalidateDashboards();
  return { id: entry.id, label: entry.label, percent: Number(entry.percent) };
}

export async function deleteTaxEntry(taxEntryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.taxEntry.deleteMany({
    where: { id: taxEntryId, userId: session.user.id },
  });

  revalidateDashboards();
}

// Título/descripción optimizados con IA para una publicación — no persiste
// nada (el usuario decide si copia el resultado a su publicación real en
// Mercado Libre desde ahí), así que solo valida sesión y devuelve el
// resultado del modelo.
export type PricingCalcInput = {
  mode: "costToPrice" | "priceToMargin";
  cogs: number;
  price?: number; // requerido en modo priceToMargin
  targetMarginPercent?: number; // requerido en modo costToPrice
  shippingCost: number;
  adsPercent: number;
  taxPercent: number;
  // Si se eligió un producto real de la cuenta, se usa la comisión REAL de
  // Mercado Libre para esa categoría (getSaleFee). Si no, se usa el % manual
  // que ingresa el usuario — y el resultado avisa que es una estimación.
  siteId: string | null;
  categoryId: string | null;
  listingTypeId: string | null;
  manualCommissionPercent: number;
};

export type PricingCalcResult = {
  price: number;
  commissionAmount: number;
  commissionPercent: number;
  shippingCost: number;
  adsAmount: number;
  taxAmount: number;
  cogs: number;
  netProfit: number;
  marginPercent: number;
  commissionIsReal: boolean;
};

function buildResult(
  price: number,
  cogs: number,
  shippingCost: number,
  adsPercent: number,
  taxPercent: number,
  commissionAmount: number,
  commissionIsReal: boolean,
): PricingCalcResult {
  const adsAmount = price * (adsPercent / 100);
  const taxAmount = price * (taxPercent / 100);
  const netProfit = price - commissionAmount - shippingCost - adsAmount - taxAmount - cogs;
  return {
    price,
    commissionAmount,
    commissionPercent: price > 0 ? (commissionAmount / price) * 100 : 0,
    shippingCost,
    adsAmount,
    taxAmount,
    cogs,
    netProfit,
    marginPercent: price > 0 ? (netProfit / price) * 100 : 0,
    commissionIsReal,
  };
}

// Comisión real de ML para ese precio exacto (getSaleFee, endpoint oficial de
// listing_prices) cuando el usuario eligió un producto real de su cuenta —
// si no hay categoría (modo manual) o la API falla, cae al % que ingresó el
// usuario a mano y lo marca como estimado, nunca lo presenta como real.
async function resolveCommission(
  accessToken: string | null,
  input: PricingCalcInput,
  price: number,
): Promise<{ amount: number; isReal: boolean }> {
  if (accessToken && input.siteId && input.categoryId && input.listingTypeId) {
    const fee = await getSaleFee(accessToken, input.siteId, price, input.categoryId, input.listingTypeId);
    if (fee !== null) return { amount: fee, isReal: true };
  }
  return { amount: price * (input.manualCommissionPercent / 100), isReal: false };
}

export async function calculatePricing(input: PricingCalcInput): Promise<PricingCalcResult | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const usesRealFee = Boolean(input.siteId && input.categoryId && input.listingTypeId);
  const accessToken = usesRealFee ? await ensureFreshMeliToken(session.user.id) : null;

  if (input.mode === "priceToMargin") {
    const price = input.price ?? 0;
    if (price <= 0) return { error: "Ingresa un precio de venta válido" };
    const { amount, isReal } = await resolveCommission(accessToken, input, price);
    return buildResult(price, input.cogs, input.shippingCost, input.adsPercent, input.taxPercent, amount, isReal);
  }

  // costToPrice: no hay forma de despejar el precio algebraicamente cuando
  // la comisión real de ML no es un % fijo (puede tener cargos escalonados
  // por categoría) — se resuelve por bisección, evaluando la comisión real
  // en cada intento hasta converger al precio que deja el margen pedido.
  const targetMargin = input.targetMarginPercent ?? 0;
  const base = input.cogs + input.shippingCost;
  let low = base > 0 ? base : 1000;
  let high = (base > 0 ? base : 1000) * 15;
  let lastReal = true;

  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    const { amount, isReal } = await resolveCommission(accessToken, input, mid);
    lastReal = isReal;
    const result = buildResult(mid, input.cogs, input.shippingCost, input.adsPercent, input.taxPercent, amount, isReal);
    if (result.marginPercent < targetMargin) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const finalPrice = (low + high) / 2;
  const { amount, isReal } = await resolveCommission(accessToken, input, finalPrice);
  return buildResult(finalPrice, input.cogs, input.shippingCost, input.adsPercent, input.taxPercent, amount, isReal || lastReal);
}

export type SeoOptimizerResult = {
  categoryId: string | null;
  categoryName: string | null;
  categorySource: "producto-real" | "detectada" | "no-detectada";
  keywords: { term: string; score: "alta" | "media" | "baja" }[];
  titles: string[];
  catalogTitle: string;
  trendsCount: number;
  aiSynonymsCount: number;
};

// Orquesta el Optimizador SEO: detecta la categoría real de Mercado Libre
// (si no vino ya de una publicación propia), pide las búsquedas más
// reales dentro de esa categoría, las combina con sinónimos por IA, filtra
// lo que no aplica a este producto puntual, y por último genera títulos
// usando esas keywords reales en vez de inventar un título sin ningún
// dato de búsqueda real detrás.
export async function runSeoOptimizer(input: {
  productName: string;
  brand?: string;
  categoryIdHint?: string;
  siteId: string;
}): Promise<SeoOptimizerResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const productName = input.productName.trim();
  const siteId = input.siteId || "MCO";
  const token = await ensureFreshMeliToken(session.user.id);

  let categoryId: string | null = null;
  let categoryName: string | null = null;
  let categorySource: SeoOptimizerResult["categorySource"] = "no-detectada";

  if (input.categoryIdHint) {
    categoryId = input.categoryIdHint;
    categoryName = await getCategoryName(categoryId).catch(() => null);
    categorySource = "producto-real";
  } else if (productName) {
    const match = await discoverCategory(siteId, productName);
    if (match) {
      categoryId = match.categoryId;
      categoryName = match.categoryName;
      categorySource = "detectada";
    }
  }

  // Cada llamada a Claude se protege por separado — un 503 transitorio de
  // Anthropic en UNA de las 3 llamadas (visto en producción: "credential
  // validation failed" intermitente) no puede tirar abajo todo el
  // Optimizador SEO. Con datos reales de ML (categoría/tendencias) siempre
  // se responde algo útil aunque la parte de IA falle esa vez.
  const [trendKeywords, aiSynonyms] = await Promise.all([
    token && categoryId
      ? getTrendingSearches(token, siteId, categoryId).catch(() => [])
      : Promise.resolve([]),
    productName ? generateSearchTerms(productName).catch(() => []) : Promise.resolve([]),
  ]);

  const trendTerms = trendKeywords.map((k) => k.keyword);
  const candidates = Array.from(new Set([...trendTerms, ...aiSynonyms].map((t) => t.trim()).filter(Boolean)));

  // Si el filtro por IA falla, mejor mostrar los candidatos sin filtrar
  // (con su score real) que no mostrar ninguna keyword.
  const filtered =
    productName && candidates.length > 0 ? await filterRelevantKeywords(productName, candidates).catch(() => candidates) : [];

  const trendSet = new Set(trendTerms.map((t) => t.toLowerCase()));
  const keywords = filtered.map((term) => {
    const lower = term.toLowerCase();
    let score: "alta" | "media" | "baja" = "baja";
    if (trendSet.has(lower)) {
      score = "alta";
    } else if ([...trendSet].some((t) => t.includes(lower) || lower.includes(t))) {
      score = "media";
    }
    return { term, score };
  });

  const seoTitles = productName
    ? await generateSeoTitles({
        productName,
        keywords: keywords.map((k) => k.term),
        categoryName: categoryName ?? undefined,
        brand: input.brand,
      }).catch(() => null)
    : null;

  return {
    categoryId,
    categoryName,
    categorySource,
    keywords,
    titles: seoTitles?.titles ?? [],
    catalogTitle: seoTitles?.catalogTitle ?? "",
    trendsCount: trendTerms.length,
    aiSynonymsCount: aiSynonyms.length,
  };
}

export async function generateDescription(input: DetailedDescriptionInput): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  return generateDetailedDescription(input);
}

// Sugerencias de texto para el set de 5 infografías — el usuario las revisa
// y edita en el cliente antes de generar ninguna imagen (ver
// generateInfographicSetClaims en ai.ts para las reglas anti-invención).
export async function suggestInfographicSetClaims(
  productName: string,
  keyFeatures: string,
): Promise<InfographicClaim[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  return generateInfographicSetClaims(productName, keyFeatures);
}

// Le pide a Claude (con visión, no un promedio de píxeles) que sugiera un
// color de acento mirando la foto real del producto.
export async function suggestAccentColorFromImage(input: {
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const hasUploadedImage = Boolean(input.imageDataUrl?.startsWith("data:image/"));
  const hasRealImage = Boolean(input.imageUrl && isAllowedImageHost(input.imageUrl));
  if (!hasUploadedImage && !hasRealImage) throw new Error("Falta la foto del producto");

  const rawDataUrl = await resolveImageDataUrl({
    imageDataUrl: hasUploadedImage ? input.imageDataUrl : undefined,
    imageUrl: hasRealImage ? input.imageUrl : undefined,
  });
  return suggestAccentColor(rawDataUrl);
}
