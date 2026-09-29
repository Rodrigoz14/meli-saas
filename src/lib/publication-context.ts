// Handoff entre las 3 páginas de Publicaciones (SEO -> Descripción ->
// Imágenes): cada herramienta guarda lo que generó, la siguiente la lee al
// montar para precargarse y muestra un aviso "Usando datos de..." con la
// opción de ignorarlo. Vive en sessionStorage (no en el servidor/DB) porque
// es un dato de uso inmediato dentro de la misma sesión del navegador, no
// algo que tenga sentido sincronizar entre dispositivos ni conservar
// indefinidamente.

export type SeoKeywordScore = "alta" | "media" | "baja";

export type PublicationContext = {
  productId: string; // "" cuando se arrancó desde cero (sin producto real)
  productName: string;
  categoryId?: string;
  categoryName?: string;
  keywords: { term: string; score: SeoKeywordScore }[];
  // Texto libre de características que el vendedor escribió en el
  // Optimizador SEO — más rico que la lista plana de keywords, así que
  // Descripción lo prefiere sobre esa lista cuando existe.
  rawKeyFeatures?: string;
  bestTitle?: string;
  description?: string;
  savedAt: number;
};

const STORAGE_PREFIX = "meliboost:pubctx:";
const LAST_KEY = "meliboost:pubctx:_last";

function storageKey(productId: string): string {
  return `${STORAGE_PREFIX}${productId || "_scratch"}`;
}

export function savePublicationContext(ctx: Omit<PublicationContext, "savedAt">): void {
  try {
    const existing = getPublicationContext(ctx.productId);
    const merged: PublicationContext = { ...existing, ...ctx, savedAt: Date.now() };
    sessionStorage.setItem(storageKey(ctx.productId), JSON.stringify(merged));
    // Descripción e Imágenes no saben de antemano qué producto se usó en
    // el Optimizador SEO — este puntero es lo que les permite precargarse
    // solas al entrar, sin que el usuario tenga que volver a elegir el
    // mismo producto en cada página.
    sessionStorage.setItem(LAST_KEY, ctx.productId);
  } catch {
    // sessionStorage puede fallar (modo privado, storage lleno) — no es
    // crítico, el usuario simplemente no tendrá precarga entre pestañas.
  }
}

export function getLastPublicationContext(): PublicationContext | null {
  try {
    const lastProductId = sessionStorage.getItem(LAST_KEY);
    if (lastProductId === null) return null;
    return getPublicationContext(lastProductId);
  } catch {
    return null;
  }
}

export function getPublicationContext(productId: string): PublicationContext | null {
  try {
    const raw = sessionStorage.getItem(storageKey(productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.productName !== "string") return null;
    return parsed as PublicationContext;
  } catch {
    return null;
  }
}

export function clearPublicationContext(productId: string): void {
  try {
    sessionStorage.removeItem(storageKey(productId));
  } catch {
    // ver nota en savePublicationContext
  }
}

export function minutesAgo(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60000));
}
