// Lógica de agregación para "Búsqueda de productos" — toma las
// publicaciones reales que trae la extensión de Chrome (ver
// `useExtensionBridge` en product-search.tsx) y arma el reporte de las 3
// pestañas (Demanda/Mercado/Estrategia). La extensión es obligatoria: sin
// ella no hay ninguna fuente de datos, así que esto ya no genera mock.
//
// La estructura de este reporte (pestañas Demanda/Mercado/Estrategia,
// columnas de la tabla, fórmula de facturación estimada) está calcada de
// Selltrix - Investigación de Productos, analizada a partir de un video
// real de su funcionamiento (ver historial del chat). Confirmamos con datos
// reales de esa herramienta que:
//   facturación estimada = precio × visitas × 3% (tasa de conversión asumida)
//
// También confirmamos matemáticamente (unidades implícitas = facturación /
// precio no son enteras) que "visitas" NO es un dato medido ni siquiera en
// Selltrix — Mercado Libre nunca expone las vistas reales de una
// publicación ajena a nadie. Es una estimación por posición, igual en su
// producto real que en el nuestro.

const ASSUMED_CONVERSION_RATE = 0.03;

export type NicheRow = {
  id: string;
  title: string;
  price: number;
  visits: number;
  estimatedRevenue: number;
  isFull: boolean;
  isCatalog: boolean;
  origin: "Local" | "Internacional";
  seller: string;
  thumbnail?: string | null;
  permalink?: string | null;
};

export type NicheReport = {
  query: string;
  currencyId: string;
  relatedKeywords: string[];
  isRealData: boolean;
  rows: NicheRow[];
  demand: {
    totalVisits: number;
    avgVisitsPerListing: number;
    estimatedSales: number;
    estimatedRevenue: number;
    highDemandListings: number;
    highRevenueListings: number;
    top3SharePercent: number;
    potentialText: string;
    verdict: "aprobado" | "riesgo";
    verdictText: string;
  };
  market: {
    totalPublications: number;
    fullPercent: number;
    catalogPercent: number;
    internationalPercent: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    marketShare: { title: string; percent: number }[];
    opportunityText: string;
    verdictText: string;
    readingText: string;
    actionPlan: {
      producto: string;
      logistica: string;
      precio: string;
      posicionamiento: string;
    };
  };
  strategy: {
    demandLabel: string;
    growthText: string;
    catalogText: string;
    verdictText: string;
  };
};

const RELATED_PREFIXES = ["", "mini ", "portátil "];
const RELATED_SUFFIXES = ["premium", "resistente", "para exterior"];

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

export function buildRelatedKeywords(query: string): string[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  return Array.from(
    new Set(
      RELATED_SUFFIXES.map((suffix, i) => `${RELATED_PREFIXES[i % RELATED_PREFIXES.length]}${cleanQuery} ${suffix}`.trim()),
    ),
  );
}

// Toma publicaciones ya extraídas (mock o reales) y arma el reporte
// completo de las 3 pestañas. Comparte la misma fórmula y los mismos
// textos de veredicto sin importar de dónde vinieron las filas.
export function buildNicheReport(
  query: string,
  rows: NicheRow[],
  options: { relatedKeywords?: string[]; totalPublications?: number; isRealData?: boolean } = {},
): NicheReport {
  const cleanQuery = query.trim();
  const relatedKeywords = options.relatedKeywords ?? buildRelatedKeywords(cleanQuery);
  const isRealData = options.isRealData ?? false;

  if (rows.length === 0) {
    return {
      query: cleanQuery,
      currencyId: "COP",
      relatedKeywords,
      isRealData,
      rows: [],
      demand: {
        totalVisits: 0,
        avgVisitsPerListing: 0,
        estimatedSales: 0,
        estimatedRevenue: 0,
        highDemandListings: 0,
        highRevenueListings: 0,
        top3SharePercent: 0,
        potentialText: "No encontramos publicaciones para este término.",
        verdict: "riesgo",
        verdictText: "Sin datos suficientes para dar un veredicto.",
      },
      market: {
        totalPublications: 0,
        fullPercent: 0,
        catalogPercent: 0,
        internationalPercent: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        marketShare: [],
        opportunityText: "",
        verdictText: "",
        readingText: "",
        actionPlan: { producto: "", logistica: "", precio: "", posicionamiento: "" },
      },
      strategy: { demandLabel: "", growthText: "", catalogText: "", verdictText: "" },
    };
  }

  // --- Demanda ---
  const totalVisits = rows.reduce((sum, r) => sum + r.visits, 0);
  const avgVisitsPerListing = Math.round(totalVisits / rows.length);
  const totalEstimatedRevenue = rows.reduce((sum, r) => sum + r.estimatedRevenue, 0);
  const estimatedSales = Math.round(totalVisits * ASSUMED_CONVERSION_RATE);
  const highDemandListings = rows.filter((r) => r.visits > avgVisitsPerListing).length;
  const highRevenueListings = rows.filter((r) => r.estimatedRevenue > totalEstimatedRevenue / rows.length).length;

  const sortedByRevenueDesc = [...rows].sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  const top3Revenue = sortedByRevenueDesc.slice(0, 3).reduce((sum, r) => sum + r.estimatedRevenue, 0);
  const top3SharePercent = Math.round((top3Revenue / (totalEstimatedRevenue || 1)) * 100);

  const richListings = rows.filter((r) => r.estimatedRevenue > 1_200_000).length;
  const potentialText =
    richListings > 0
      ? `Nicho con demanda. Tráfico orgánico alto. Mercado sano y distribuido. ${richListings} publicaciones superan ${money(1_200_000)}. Hay dinero para varios jugadores y la demanda está validada.`
      : `Nicho con poca demanda. Tráfico orgánico bajo. Ninguna publicación supera ${money(1_200_000)} en facturación estimada — evalúa si el mercado es suficientemente grande antes de invertir.`;

  const demandVerdict: "aprobado" | "riesgo" = richListings >= 3 && top3SharePercent < 70 ? "aprobado" : "riesgo";
  const demandVerdictText =
    demandVerdict === "aprobado"
      ? "NICHO APROBADO. Mercado validado con múltiples ganadores. Entra con diferenciación visual y logística Full para capturar tu porción."
      : "NICHO EN RIESGO. Pocos ganadores o demanda insuficiente — evalúa diferenciarte fuerte antes de invertir.";

  // --- Mercado ---
  const totalPublications = options.totalPublications ?? rows.length;
  const fullCount = rows.filter((r) => r.isFull).length;
  const catalogCount = rows.filter((r) => r.isCatalog).length;
  const internationalCount = rows.filter((r) => r.origin === "Internacional").length;
  const fullPercent = Math.round((fullCount / rows.length) * 100);
  const catalogPercent = Math.round((catalogCount / rows.length) * 100);
  const internationalPercent = Math.round((internationalCount / rows.length) * 100);
  const prices = rows.map((r) => r.price);
  const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const marketShare = sortedByRevenueDesc.slice(0, 8).map((r) => ({
    title: r.title,
    percent: Math.round((r.estimatedRevenue / (totalEstimatedRevenue || 1)) * 100),
  }));

  const leaderShare = marketShare[0]?.percent ?? 0;
  const opportunityText =
    leaderShare >= 30
      ? `El ${leaderShare}% de las ventas está concentrado en un solo producto. Diversifique la oferta para capturar más mercado.`
      : "Las ventas están bien distribuidas entre varios vendedores — hay espacio para entrar sin enfrentar un solo dominador.";

  const saturationLabel =
    totalPublications >= 1000
      ? "alta (1000+ publicaciones)"
      : totalPublications >= 500
        ? "moderada (500-999 publicaciones)"
        : "baja (menos de 500 publicaciones)";

  const marketVerdictText =
    leaderShare < 40 && fullPercent < 40
      ? "Oportunidad clara con bajo riesgo de entrada"
      : "Oportunidad exigente — el mercado ya tiene jugadores fuertes";

  const readingText =
    `El mercado presenta saturación ${saturationLabel}, con ${fullPercent < 30 ? "poca" : "alta"} exposición de la competencia (solo ${fullPercent}% usa Full). ` +
    `Hay ${catalogPercent < 50 ? "espacio para diferenciación" : "alta estandarización"} con ${catalogPercent}% en catálogo. ` +
    `El ticket promedio de ${money(avgPrice)} permite ${avgPrice > 60000 ? "márgenes saludables" : "márgenes ajustados"}. ` +
    `El ${top3SharePercent}% concentrado en los 3 líderes indica ${top3SharePercent > 60 ? "líderes aislados a los que atacar" : "un mercado bien repartido"}.`;

  const actionPlan = {
    producto: "La innovación manda. Diferencia tu producto para mejorar funcionalidad y mejorar el valor percibido.",
    logistica:
      fullPercent < 30
        ? "Domina el posicionamiento simplemente activando Full. Ventaja competitiva inmediata."
        : "La mayoría ya usa Full — sin esa ventaja vas a necesitar diferenciarte en otro punto.",
    precio: `Rango ideal (>${money(minPrice * 1.1)}). Invierte en empaque premium y absorbe flete sin destruir rentabilidad.`,
    posicionamiento:
      catalogPercent < 50
        ? "Escenario ideal: domina con infografías, títulos optimizados y descripciones únicas."
        : "Mercado más profesionalizado — vas a necesitar contenido de catálogo de alta calidad para competir.",
  };

  // --- Estrategia ---
  const demandLabel =
    avgVisitsPerListing > 500
      ? `Demanda alta (${avgVisitsPerListing} visitas promedio)`
      : avgVisitsPerListing > 150
        ? `Demanda moderada (${avgVisitsPerListing} visitas promedio)`
        : `Demanda baja (${avgVisitsPerListing} visitas promedio)`;

  const growthText = `${money(totalEstimatedRevenue)} en facturación estimada - Mercado ${totalEstimatedRevenue > 5_000_000 ? "rentable" : "de nicho"}`;
  const catalogText = `Solo ${catalogPercent}% son catálogos - ${catalogPercent < 50 ? "Oportunidad de diferenciación" : "Mercado estandarizado"}`;

  const strategyVerdictText =
    demandVerdict === "aprobado" && top3SharePercent < 70
      ? "MERCADO VALIDADO. Demanda real con márgenes protegibles. Entrada viable con diferenciación clara."
      : "MERCADO EXIGENTE. La demanda o la concentración de ventas no te dan margen de error — entra solo con una ventaja clara.";

  return {
    query: cleanQuery,
    currencyId: "COP",
    relatedKeywords,
    isRealData,
    rows,
    demand: {
      totalVisits,
      avgVisitsPerListing,
      estimatedSales,
      estimatedRevenue: totalEstimatedRevenue,
      highDemandListings,
      highRevenueListings,
      top3SharePercent,
      potentialText,
      verdict: demandVerdict,
      verdictText: demandVerdictText,
    },
    market: {
      totalPublications,
      fullPercent,
      catalogPercent,
      internationalPercent,
      avgPrice,
      minPrice,
      maxPrice,
      marketShare,
      opportunityText,
      verdictText: marketVerdictText,
      readingText,
      actionPlan,
    },
    strategy: {
      demandLabel,
      growthText,
      catalogText,
      verdictText: strategyVerdictText,
    },
  };
}

