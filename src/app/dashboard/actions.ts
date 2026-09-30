"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  describeProductImage,
  filterRelevantKeywords,
  generateDetailedDescription,
  generateInfographicSetClaims,
  generateSeoKeywordCandidates,
  generateSeoTitles,
  suggestAccentColor,
  type DetailedDescriptionInput,
  type InfographicClaim,
} from "@/lib/ai";
import {
  appendItemPictures,
  ensureFreshMeliToken,
  getSaleFee,
  getTrendingSearches,
  updateItemDescription,
  updateItemTitle,
  uploadPicture,
} from "@/lib/meli-api";
import { discoverCategory, getCategoryDetails, type MeliCategoryNode } from "@/lib/meli-public-api";
import { isAllowedImageHost, resolveImageDataUrl } from "@/lib/infographic-set";

// El Optimizador SEO y Descripción reciben la foto ya sea recién subida
// (data URL) o reusada de otra pestaña (puede ser la URL real de una
// publicación de Mercado Libre, guardada en el contexto compartido) — este
// helper normaliza cualquiera de las 2 antes de pedirle a Claude que la
// describa, nunca lanza (si falla, el llamador sigue sin el dato de foto).
async function describeSharedImage(image: string | undefined): Promise<string | null> {
  if (!image) return null;
  const hasUploadedImage = image.startsWith("data:image/");
  const hasRealImage = isAllowedImageHost(image);
  if (!hasUploadedImage && !hasRealImage) return null;

  try {
    const resolved = await resolveImageDataUrl({
      imageDataUrl: hasUploadedImage ? image : undefined,
      imageUrl: hasRealImage ? image : undefined,
    });
    return await describeProductImage(resolved);
  } catch {
    return null;
  }
}

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

export type CategoryTier = "alta" | "media" | "baja";

export type SeoOptimizerResult = {
  categoryId: string | null;
  categoryName: string | null;
  categoryPath: MeliCategoryNode[];
  categorySource: "producto-real" | "detectada" | "no-detectada";
  categoryTrending: { term: string; tier: CategoryTier }[];
  keywords: { term: string; score: CategoryTier }[];
  titles: string[];
  catalogTitle: string;
  trendsCount: number;
  aiSynonymsCount: number;
};

// Orquesta el Optimizador SEO: detecta la categoría real de Mercado Libre
// (si no vino ya de una publicación propia) con su camino completo hasta la
// raíz, pide las búsquedas más reales en 3 niveles de esa categoría
// (específica/padre/general — "Más buscados en categoría"), las combina con
// sinónimos por IA, filtra lo que no aplica a este producto puntual, y por
// último genera títulos usando esas keywords reales en vez de inventar un
// título sin ningún dato de búsqueda real detrás. La foto (opcional) es
// solo una fuente más de contexto real, igual que el nombre o la URL.
export async function runSeoOptimizer(input: {
  productName: string;
  brand?: string;
  keyFeatures?: string;
  categoryIdHint?: string;
  siteId: string;
  imageDataUrl?: string;
}): Promise<SeoOptimizerResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const siteId = input.siteId || "MCO";
  const token = await ensureFreshMeliToken(session.user.id);

  const imageDescription = await describeSharedImage(input.imageDataUrl);
  // Si no hay nombre pero sí foto, la descripción real de la foto pasa a
  // ser la "consulta" para detectar categoría y buscar keywords.
  const productName = input.productName.trim() || imageDescription?.trim() || "";

  let categoryId: string | null = null;
  let categoryName: string | null = null;
  let categoryPath: MeliCategoryNode[] = [];
  let categorySource: SeoOptimizerResult["categorySource"] = "no-detectada";

  if (input.categoryIdHint) {
    categoryId = input.categoryIdHint;
    const details = await getCategoryDetails(categoryId).catch(() => null);
    categoryName = details?.name ?? null;
    categoryPath = details?.path ?? [];
    categorySource = "producto-real";
  } else if (productName) {
    const match = await discoverCategory(siteId, productName);
    if (match) {
      categoryId = match.categoryId;
      categoryName = match.categoryName;
      categorySource = "detectada";
      const details = await getCategoryDetails(categoryId).catch(() => null);
      categoryPath = details?.path ?? [];
    }
  }

  // 3 niveles reales de amplitud: la categoría específica (la hoja), su
  // padre inmediato, y la más general del árbol — mismas 3 etiquetas que
  // usa Selltrix ("cat. específica"/"cat. padre"/"cat. general"). Si el
  // árbol tiene menos de 3 niveles, simplemente hay menos tiers reales.
  const tiers: { id: string; tier: CategoryTier }[] = [];
  if (categoryId) tiers.push({ id: categoryId, tier: "baja" });
  if (categoryPath.length >= 2) tiers.push({ id: categoryPath[categoryPath.length - 2].id, tier: "media" });
  if (categoryPath.length >= 3) tiers.push({ id: categoryPath[0].id, tier: "alta" });
  const uniqueTiers = tiers.filter((t, i) => tiers.findIndex((o) => o.id === t.id) === i);

  // Cada llamada a Claude se protege por separado — un 503 transitorio de
  // Anthropic en UNA de las llamadas (visto en producción: "credential
  // validation failed" intermitente) no puede tirar abajo todo el
  // Optimizador SEO. Con datos reales de ML (categoría/tendencias) siempre
  // se responde algo útil aunque la parte de IA falle esa vez.
  const [tierResults, aiSynonyms] = await Promise.all([
    token
      ? Promise.all(
          uniqueTiers.map(async (t) => ({
            tier: t.tier,
            keywords: await getTrendingSearches(token, siteId, t.id).catch(() => []),
          })),
        )
      : Promise.resolve([]),
    productName
      ? generateSeoKeywordCandidates(productName, input.keyFeatures, imageDescription ?? undefined).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Si el mismo término aparece en varios niveles, se queda con el más
  // específico (baja > media > alta) para no duplicar chips.
  const categoryTrendingMap = new Map<string, { term: string; tier: CategoryTier }>();
  const tierPriority: CategoryTier[] = ["baja", "media", "alta"];
  for (const tier of tierPriority) {
    const result = tierResults.find((r) => r.tier === tier);
    if (!result) continue;
    for (const k of result.keywords) {
      const key = k.keyword.toLowerCase();
      if (!categoryTrendingMap.has(key)) categoryTrendingMap.set(key, { term: k.keyword, tier });
    }
  }
  const allTrendTerms = Array.from(categoryTrendingMap.values());
  const leafTrendTerms = (tierResults.find((r) => r.tier === "baja")?.keywords ?? []).map((k) => k.keyword);
  const parentTrendTerms = (tierResults.find((r) => r.tier === "media")?.keywords ?? []).map((k) => k.keyword);

  // Igual que con las keywords del producto: se filtran por relevancia
  // real al producto (las tendencias del nivel "general" del árbol suelen
  // traer mucho ruido no relacionado).
  const relevantTrendingTerms =
    productName && allTrendTerms.length > 0
      ? await filterRelevantKeywords(
          productName,
          allTrendTerms.map((t) => t.term),
        ).catch(() => allTrendTerms.map((t) => t.term))
      : [];
  const categoryTrending = relevantTrendingTerms
    .map((term) => categoryTrendingMap.get(term.toLowerCase()))
    .filter((t): t is { term: string; tier: CategoryTier } => Boolean(t));

  // El pool de candidatos ahora suma también las tendencias reales del
  // nivel padre (antes solo se usaba la categoría específica) — más
  // volumen real de dónde filtrar, en vez de depender casi solo de los
  // sinónimos por IA para tener suficientes keywords.
  const candidates = Array.from(
    new Set([...leafTrendTerms, ...parentTrendTerms, ...aiSynonyms].map((t) => t.trim()).filter(Boolean)),
  );

  // Si el filtro por IA falla, mejor mostrar los candidatos sin filtrar
  // (con su score real) que no mostrar ninguna keyword.
  const filtered =
    productName && candidates.length > 0 ? await filterRelevantKeywords(productName, candidates).catch(() => candidates) : [];

  const leafSet = new Set(leafTrendTerms.map((t) => t.toLowerCase()));
  const parentSet = new Set(parentTrendTerms.map((t) => t.toLowerCase()));
  const keywords = filtered.map((term) => {
    const lower = term.toLowerCase();
    let score: CategoryTier = "baja";
    if (leafSet.has(lower)) {
      score = "alta";
    } else if (parentSet.has(lower) || [...leafSet].some((t) => t.includes(lower) || lower.includes(t))) {
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
        keyFeatures: input.keyFeatures,
        imageDescription: imageDescription ?? undefined,
      }).catch(() => null)
    : null;

  return {
    categoryId,
    categoryName,
    categoryPath,
    categorySource,
    categoryTrending,
    keywords,
    titles: seoTitles?.titles ?? [],
    catalogTitle: seoTitles?.catalogTitle ?? "",
    trendsCount: allTrendTerms.length,
    aiSynonymsCount: aiSynonyms.length,
  };
}

export async function generateDescription(
  input: Omit<DetailedDescriptionInput, "imageDescription"> & { imageDataUrl?: string },
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const { imageDataUrl, ...rest } = input;
  const imageDescription = await describeSharedImage(imageDataUrl);

  return generateDetailedDescription({ ...rest, imageDescription: imageDescription ?? undefined });
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

export type PublishResult = { ok: boolean; error?: string };

// Nunca confía en un meliItemId mandado desde el cliente — lo vuelve a
// resolver desde la DB, atado al productId Y al userId autenticado, así
// un usuario no puede escribirle a una publicación que no es suya aunque
// manipule el request. Devuelve {ok,error} en vez de lanzar porque el
// motivo real del rechazo de Mercado Libre (ej. "no se puede editar el
// título de una publicación con ventas") es información que el usuario
// tiene que ver, no un toast genérico.
async function resolveOwnMeliItemId(productId: string, userId: string): Promise<string | null> {
  const product = await prisma.product.findFirst({ where: { id: productId, userId } });
  return product?.meliItemId ?? null;
}

// Publica el título optimizado directo sobre la publicación real del
// usuario en Mercado Libre (PUT /items/{id}) — a diferencia de "Copiar",
// esto escribe de verdad sobre un listado en vivo, por eso la UI tiene que
// confirmar antes de llamar a esto.
export async function publishTitleToMeli(productId: string, title: string): Promise<PublishResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const meliItemId = await resolveOwnMeliItemId(productId, session.user.id);
  if (!meliItemId) return { ok: false, error: "Esta publicación no tiene un ID real de Mercado Libre asociado." };

  const accessToken = await ensureFreshMeliToken(session.user.id);
  if (!accessToken) return { ok: false, error: "No hay una cuenta de Mercado Libre conectada." };

  try {
    await updateItemTitle(accessToken, meliItemId, title);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Mercado Libre rechazó el cambio." };
  }
}

// Publica la descripción generada directo sobre la publicación real
// (PUT /items/{id}/description — sub-recurso separado del título en la
// API de Mercado Libre).
export async function publishDescriptionToMeli(productId: string, description: string): Promise<PublishResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const meliItemId = await resolveOwnMeliItemId(productId, session.user.id);
  if (!meliItemId) return { ok: false, error: "Esta publicación no tiene un ID real de Mercado Libre asociado." };

  const accessToken = await ensureFreshMeliToken(session.user.id);
  if (!accessToken) return { ok: false, error: "No hay una cuenta de Mercado Libre conectada." };

  try {
    await updateItemDescription(accessToken, meliItemId, description);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Mercado Libre rechazó el cambio." };
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Imagen inválida");
  const [, mimeType, base64] = match;
  return new Blob([Buffer.from(base64, "base64")], { type: mimeType });
}

// Sube las infografías elegidas como fotos reales de la publicación,
// SUMÁNDOLAS a las que ya tiene (nunca borra las existentes — ver
// appendItemPictures en meli-api.ts, que trae las actuales antes de
// escribir). Si una imagen puntual falla al subir, sigue con el resto en
// vez de abortar todo el lote.
export async function publishImagesToMeli(
  productId: string,
  images: { category: string; dataUrl: string }[],
): Promise<PublishResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const meliItemId = await resolveOwnMeliItemId(productId, session.user.id);
  if (!meliItemId) return { ok: false, error: "Esta publicación no tiene un ID real de Mercado Libre asociado." };

  const accessToken = await ensureFreshMeliToken(session.user.id);
  if (!accessToken) return { ok: false, error: "No hay una cuenta de Mercado Libre conectada." };

  if (images.length === 0) return { ok: false, error: "No hay imágenes seleccionadas para subir." };

  const uploadedIds: string[] = [];
  const failedCategories: string[] = [];
  for (const image of images) {
    try {
      const id = await uploadPicture(accessToken, dataUrlToBlob(image.dataUrl), `${image.category}.png`);
      uploadedIds.push(id);
    } catch {
      failedCategories.push(image.category);
    }
  }

  if (uploadedIds.length === 0) {
    return { ok: false, error: "No se pudo subir ninguna imagen a Mercado Libre." };
  }

  try {
    await appendItemPictures(accessToken, meliItemId, uploadedIds);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Mercado Libre rechazó las imágenes." };
  }

  if (failedCategories.length > 0) {
    return { ok: true, error: `${failedCategories.length} imagen(es) no se pudieron subir: ${failedCategories.join(", ")}` };
  }
  return { ok: true };
}
