// Llamadas públicas de Mercado Libre (sin token de usuario) — separadas de
// meli-api.ts porque esas SIEMPRE requieren el access_token de una cuenta
// conectada, mientras que estas son anónimas.
//
// Los endpoints legacy de autosuggest/category_predictor que se probaron
// primero (`/sites/{site}/autosuggest`, `/sites/{site}/category_predictor/predict`)
// ya no existen (404 "resource not found" verificado en vivo) — domain_discovery
// es el reemplazo real que Mercado Libre sigue exponiendo públicamente y
// devuelve exactamente lo que necesitamos: la categoría real detectada para
// un texto de búsqueda libre.

const MELI_API = "https://api.mercadolibre.com";

export type MeliCategoryMatch = {
  domainId: string;
  domainName: string;
  categoryId: string;
  categoryName: string;
};

// GET /sites/{site}/domain_discovery/search?q=... — devuelve la categoría
// real de Mercado Libre para un texto libre (ej. "audifonos bluetooth" ->
// MCO3697 "Audífonos"). Nunca lanza: si el endpoint cambia o falla, el
// llamador cae al detector por IA en vez de romper el flujo.
export async function discoverCategory(siteId: string, query: string): Promise<MeliCategoryMatch | null> {
  const q = query.trim().slice(0, 200);
  if (!q) return null;

  try {
    const res = await fetch(
      `${MELI_API}/sites/${siteId}/domain_discovery/search?q=${encodeURIComponent(q)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.category_id) return null;

    return {
      domainId: String(first.domain_id ?? ""),
      domainName: String(first.domain_name ?? ""),
      categoryId: String(first.category_id),
      categoryName: String(first.category_name ?? ""),
    };
  } catch {
    return null;
  }
}

export type MeliCategoryNode = { id: string; name: string };

// GET /categories/{id} — nombre real de una categoría que YA conocemos por
// otra vía (ej. el categoryId real de una publicación propia), más el
// camino real desde la raíz (path_from_root: ej. "Electrónica, Audio y
// Video" -> "Audio" -> "Audífonos") — Mercado Libre sí expone esto público.
// El path es lo que permite pedir tendencias en 3 niveles de amplitud
// (categoría específica / padre / general) para "Más buscados en categoría".
export async function getCategoryDetails(categoryId: string): Promise<{ name: string; path: MeliCategoryNode[] } | null> {
  try {
    const res = await fetch(`${MELI_API}/categories/${categoryId}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.name !== "string") return null;
    const path: MeliCategoryNode[] = Array.isArray(data.path_from_root)
      ? data.path_from_root
          .filter((n: unknown): n is { id: unknown; name: unknown } => typeof n === "object" && n !== null)
          .map((n: { id: unknown; name: unknown }) => ({ id: String(n.id), name: String(n.name) }))
      : [];
    return { name: data.name, path };
  } catch {
    return null;
  }
}
