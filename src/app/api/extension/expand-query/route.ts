import { generateSearchTerms } from "@/lib/ai";

// La extensión llama esto directo desde el service worker (background.js)
// antes de armar las URLs de búsqueda de Mercado Libre — no necesita sesión
// ni datos del usuario, solo el texto que escribió, así que no pasa por el
// content script como /api/extension/dashboard.
export const maxDuration = 20;

export async function POST(req: Request) {
  let query = "";
  try {
    const body = await req.json();
    query = typeof body?.query === "string" ? body.query : "";
  } catch {
    return Response.json({ terms: [] }, { status: 400 });
  }

  if (!query.trim()) {
    return Response.json({ terms: [] }, { status: 400 });
  }

  try {
    const terms = await generateSearchTerms(query);
    return Response.json({ terms });
  } catch (err) {
    console.error("expand-query failed:", err);
    return Response.json({ terms: [] });
  }
}
