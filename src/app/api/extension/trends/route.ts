import { auth } from "@/auth";
import { ensureFreshMeliToken } from "@/lib/meli-api";

// La API de Tendencias de ML (real, oficial) ya no responde sin token
// (confirmado en vivo: 403 "PA_UNAUTHORIZED_RESULT_FROM_POLICIES" desde que
// se probó anónima) — por eso esto pasa por el content script de la
// extensión (igual que /api/extension/dashboard), que corre dentro de una
// pestaña ya logueada de la app y puede pedirlo con la sesión real.
export const maxDuration = 15;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ connected: false, reason: "no-session" });
  }

  const accessToken = await ensureFreshMeliToken(session.user.id);
  if (!accessToken) {
    return Response.json({ connected: false, reason: "no-meli" });
  }

  // Mismos países que soporta la extensión (ver SITE_DOMAINS en
  // extension/background.js) — el site_id real de ML no es simplemente
  // "M" + el código de país (ej. Argentina es MLA, no MAR).
  const SITE_IDS: Record<string, string> = {
    CO: "MCO",
    AR: "MLA",
    MX: "MLM",
    BR: "MLB",
    CL: "MLC",
    PE: "MPE",
  };
  const { searchParams } = new URL(req.url);
  const site = (searchParams.get("site") || "CO").toUpperCase();
  const siteId = SITE_IDS[site] ?? "MCO";

  try {
    const res = await fetch(`https://api.mercadolibre.com/trends/${siteId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return Response.json({ connected: true, keywords: [] });
    }
    const data: { keyword?: string }[] = await res.json();
    const keywords = Array.isArray(data)
      ? data.map((t) => t.keyword).filter((k): k is string => typeof k === "string")
      : [];
    return Response.json({ connected: true, keywords });
  } catch (err) {
    console.error("trends fetch failed:", err);
    return Response.json({ connected: true, keywords: [] });
  }
}
