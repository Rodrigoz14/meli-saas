// Generador de resultados de ejemplo para "Búsqueda de productos". No hay
// fuente de datos real todavía (ver decisión en el chat: Mercado Libre exige
// sesión logueada para ver resultados de búsqueda, así que un scraper de
// servidor no funciona — replicar esto de verdad requeriría una extensión de
// navegador, como la que usa Selltrix). Esta v1 deja el flujo completo
// (búsqueda, KPIs, tabla ordenable, veredicto) listo para conectar una fuente
// real más adelante.

export type NicheRow = {
  id: string;
  title: string;
  price: number;
  visits: number;
  estimatedRevenue: number;
  isFull: boolean;
};

export type NicheReport = {
  query: string;
  currencyId: string;
  rows: NicheRow[];
  totalVisits: number;
  totalEstimatedRevenue: number;
  verdict: "aprobado" | "riesgo";
  verdictText: string;
};

// PRNG determinístico (mulberry32) para que la misma búsqueda siempre
// devuelva los mismos resultados de ejemplo, en vez de números distintos
// cada vez que el usuario repita la misma palabra clave.
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

// La misma fórmula que se observó en la extensión de Selltrix (ver análisis
// previo): facturación estimada = precio × visitas × 3% (tasa de conversión
// asumida, no ventas reales).
const ASSUMED_CONVERSION_RATE = 0.03;

export function generateMockNicheReport(query: string): NicheReport {
  const cleanQuery = query.trim();
  const rand = mulberry32(seedFromString(cleanQuery.toLowerCase()));
  const rowCount = 8 + Math.floor(rand() * 6); // 8 a 13 resultados

  const rows: NicheRow[] = Array.from({ length: rowCount }, (_, i) => {
    const price = Math.round((20000 + rand() * 480000) / 100) * 100;
    const visits = Math.round(20 + rand() * 2000);
    const isFull = rand() > 0.55;
    const suffix = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
    const title = cleanQuery
      ? `${capitalize(cleanQuery)} ${suffix}`
      : `Producto de ejemplo ${suffix}`;

    return {
      id: `mock-${i}`,
      title,
      price,
      visits,
      estimatedRevenue: Math.round(price * visits * ASSUMED_CONVERSION_RATE),
      isFull,
    };
  });

  const totalVisits = rows.reduce((sum, r) => sum + r.visits, 0);
  const totalEstimatedRevenue = rows.reduce((sum, r) => sum + r.estimatedRevenue, 0);

  const topShare = rows.length
    ? Math.max(...rows.map((r) => r.estimatedRevenue)) / (totalEstimatedRevenue || 1)
    : 0;

  const verdict: NicheReport["verdict"] = topShare < 0.4 && rows.length >= 8 ? "aprobado" : "riesgo";
  const verdictText =
    verdict === "aprobado"
      ? "Nicho con demanda distribuida entre varios vendedores — hay espacio para entrar con una buena publicación."
      : "Mercado concentrado en pocos vendedores o con poca demanda — evalúa diferenciarte antes de invertir.";

  return {
    query: cleanQuery,
    currencyId: "COP",
    rows,
    totalVisits,
    totalEstimatedRevenue,
    verdict,
    verdictText,
  };
}

function capitalize(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
