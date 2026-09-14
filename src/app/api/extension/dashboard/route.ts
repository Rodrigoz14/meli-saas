import { auth } from "@/auth";
import { getRentabilidadData } from "@/lib/dashboard-data";

// Lo consume el content script de la extensión de Chrome (extension/content-scripts/bridge.js),
// que corre DENTRO de una pestaña de esta misma app — por eso puede pedir
// esta ruta con `credentials: "include"` y llega con la sesión real del
// usuario, sin necesitar CORS ni un token aparte. Reutiliza exactamente los
// mismos datos reales (ML + Ads) que ya calcula Rentabilidad, solo que
// resumidos para la ventana chica del panel de la extensión.
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ connected: false, reason: "no-session" });
  }

  const data = await getRentabilidadData(session.user.id);
  if (!data.connected) {
    return Response.json({ connected: false, reason: "no-meli" });
  }
  if (data.errorMessage) {
    return Response.json({ connected: true, error: data.errorMessage, products: [] });
  }

  const sorted = [...data.rows].sort((a, b) => b.revenue30d - a.revenue30d);
  const currencyId = sorted[0]?.currencyId ?? "COP";

  return Response.json({
    connected: true,
    error: null,
    currencyId,
    totalProducts: sorted.length,
    totalRevenue30d: sorted.reduce((sum, r) => sum + r.revenue30d, 0),
    totalUnits30d: sorted.reduce((sum, r) => sum + r.unitsSold30d, 0),
    totalAds30d: data.totalAds,
    adsConnected: data.adsConnected,
    products: sorted.slice(0, 20).map((r) => ({
      title: r.title,
      thumbnail: r.thumbnail,
      permalink: r.permalink,
      price: r.price,
      currencyId: r.currencyId,
      availableQuantity: r.availableQuantity,
      unitsSold30d: r.unitsSold30d,
      revenue30d: r.revenue30d,
      adsCtr: r.ads?.ctr ?? null,
      adsClicks: r.ads?.clicks ?? null,
    })),
  });
}
