// Generador de resultados de ejemplo para "Búsqueda de productos".
//
// La estructura de este reporte (pestañas Demanda/Mercado/Estrategia,
// columnas de la tabla, fórmula de facturación estimada) está calcada de
// Selltrix - Investigación de Productos, analizada a partir de un video
// real de su funcionamiento (ver historial del chat). Confirmamos con datos
// reales de esa herramienta que:
//   facturación estimada = precio × visitas × 3% (tasa de conversión asumida)
//
// Sigue sin haber una fuente de datos real conectada: Mercado Libre exige
// sesión logueada para ver resultados de búsqueda, así que esto sigue siendo
// mock hasta que se resuelva ese acceso (extensión de navegador o sesión
// autenticada compartida).

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
};

export type NicheReport = {
  query: string;
  currencyId: string;
  relatedKeywords: string[];
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

function seedFromString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUFFIXES = [
  "Premium",
  "Pro",
  "Original",
  "Reforzado",
  "2 en 1",
  "Edición Especial",
  "Antigolpes",
  "Portátil",
  "Grande",
  "Compacto",
  "Impermeable",
  "Clásico",
];

const RELATED_PREFIXES = ["", "mini ", "portátil "];
const RELATED_SUFFIXES = ["premium", "resistente", "para exterior"];

const SELLERS = [
  "TiendaOficial",
  "MegaVentasCol",
  "ImportadosExpress",
  "ElBodegón",
  "VentasDirectas365",
  "ComercialAndina",
  "PuntoOutlet",
  "DistribuidoraNorte",
];

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function capitalize(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateMockNicheReport(query: string): NicheReport {
  const cleanQuery = query.trim();
  const rand = mulberry32(seedFromString(cleanQuery.toLowerCase()));
  const rowCount = 15 + Math.floor(rand() * 16); // 15 a 30, como "Publicaciones (30)" de Selltrix

  const rows: NicheRow[] = Array.from({ length: rowCount }, (_, i) => {
    const price = Math.round((20000 + rand() * 480000) / 100) * 100;
    const visits = Math.round(3 + rand() * rand() * 2500);
    const isFull = rand() < 0.25; // en el video, solo ~20% de un mercado usa Full
    const isCatalog = rand() < 0.3; // ~30% en catálogo, igual que en el video
    const origin: NicheRow["origin"] = rand() < 0.3 ? "Internacional" : "Local";
    const seller = SELLERS[Math.floor(rand() * SELLERS.length)];
    const suffix = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
    const title = cleanQuery ? `${capitalize(cleanQuery)} ${suffix}` : `Producto de ejemplo ${suffix}`;

    return {
      id: `mock-${i}`,
      title,
      price,
      visits,
      estimatedRevenue: Math.round(price * visits * ASSUMED_CONVERSION_RATE),
      isFull,
      isCatalog,
      origin,
      seller,
    };
  });

  const relatedKeywords = cleanQuery
    ? Array.from(
        new Set(
          RELATED_SUFFIXES.map(
            (suffix, i) => `${RELATED_PREFIXES[i % RELATED_PREFIXES.length]}${cleanQuery} ${suffix}`.trim(),
          ),
        ),
      )
    : [];

  // --- Demanda ---
  const totalVisits = rows.reduce((sum, r) => sum + r.visits, 0);
  const avgVisitsPerListing = Math.round(totalVisits / (rows.length || 1));
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
  const totalPublications = Math.round(rowCount * (10 + rand() * 15));
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
    totalPublications >= 1000 ? "alta (1000+ publicaciones)" : totalPublications >= 500 ? "moderada (500-999 publicaciones)" : "baja (menos de 500 publicaciones)";

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
