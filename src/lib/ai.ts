import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Selltrix mide sus búsquedas ("28/50 disponibles") — señal de que generan
// los términos relacionados con una llamada real a un LLM, no con un
// heurístico de texto (lo que teníamos antes: quitar la primera/última
// palabra, agregar "nuevo"/"original"). Esto reemplaza eso: le pedimos a
// Haiku sinónimos y variaciones reales que un comprador escribiría en
// Mercado Libre para el mismo producto, para cubrir más del nicho real en
// una sola búsqueda de la extensión.
export async function generateSearchTerms(query: string): Promise<string[]> {
  const trimmed = query.trim().slice(0, 80);
  if (!trimmed) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Un vendedor de Mercado Libre (Latinoamérica) quiere investigar el nicho "${trimmed}".

Necesito las DIFERENTES FORMAS en que un comprador real llamaría a este mismo tipo de producto al buscarlo — NO variantes armadas agregándole un adjetivo al mismo nombre (evita cosas como "${trimmed} deportivo", "${trimmed} digital", "${trimmed} automático" — eso NO cuenta como término distinto). Quiero sinónimos genuinos, nombres alternativos o regionales, términos de la industria, y marcas genéricas del rubro que la gente usa como si fueran el nombre del producto — palabras distintas, no la misma palabra con un calificativo pegado.

Ejemplos de lo que SÍ sirve:
- "reloj" → "smartwatch", "pulsera inteligente", "cronómetro"
- "auriculares" → "audífonos", "earbuds", "cascos"
- "tenis" → "zapatillas", "calzado deportivo", "sneakers"
- "licuadora" → "batidora", "procesadora de alimentos"

Dame 6 términos así para "${trimmed}". Responde ÚNICAMENTE con un array JSON de 6 strings cortos (1-4 palabras cada uno), sin texto adicional.`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 6);
  } catch (err) {
    console.error("generateSearchTerms: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}

// Variante de generateSearchTerms específica del Optimizador SEO — pide
// más términos (15 en vez de 6) y, a diferencia de esa, SÍ combina el tipo
// de producto con atributos reales (características que escribió el
// vendedor o que describió la foto), porque esos combos son búsquedas
// reales de comprador ("audifonos bluetooth cancelacion ruido") y es
// exactamente la fuente de "más características" que pidió el usuario —
// nunca inventa un atributo que no esté en keyFeatures/imageDescription.
// No se reutiliza generateSearchTerms para esto porque esa función también
// la usa la extensión para armar variaciones de búsqueda de nicho, con un
// límite de 6 ya calibrado para no disparar demasiadas páginas a scrapear.
export async function generateSeoKeywordCandidates(
  productName: string,
  keyFeatures?: string,
  imageDescription?: string,
): Promise<string[]> {
  const name = productName.trim().slice(0, 150);
  const features = keyFeatures?.trim().slice(0, 500) ?? "";
  const imageDesc = imageDescription?.trim().slice(0, 300) ?? "";
  if (!name) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Un vendedor de Mercado Libre (Latinoamérica) quiere investigar todas las formas reales en que un comprador busca este producto: "${name}".
${features ? `\nCaracterísticas reales que dio el vendedor: "${features}"` : ""}
${imageDesc ? `\nLo que se ve realmente en la foto: "${imageDesc}"` : ""}

Necesito una lista AMPLIA y variada de términos de búsqueda reales, combinando:
1. Sinónimos genuinos o nombres alternativos/regionales del mismo tipo de producto (NO la misma palabra con un adjetivo genérico pegado).
2. Si te di características o descripción de foto reales: combos de "tipo de producto + ese atributo real" (ej. si el producto es "audífonos" y una característica real es "cancelación de ruido", el combo válido es "audifonos cancelacion ruido" — NUNCA inventes un atributo que no te haya dado).
3. Variaciones de marca/modelo si el nombre las incluye.

Dame hasta 15 términos así, sin duplicar significado. Responde ÚNICAMENTE con un array JSON de strings cortos (1-5 palabras cada uno), sin texto adicional.`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 15);
  } catch (err) {
    console.error("generateSeoKeywordCandidates: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}

export type DetailedDescriptionInput = {
  productName: string;
  keyFeatures: string;
  brand?: string;
  category?: string;
  // Estos 3 son afirmaciones reales de venta (qué trae la caja, garantía,
  // devolución) — a propósito NUNCA se los generamos con IA (a diferencia
  // del resto del texto): van tal cual el vendedor los escribió, o la
  // sección entera se omite. Inventar un plazo de garantía o una política
  // de devolución falsa es un problema legal/de confianza real, no solo un
  // detalle de marketing.
  includes?: string;
  warranty?: string;
  returnPolicy?: string;
  // Descripción real de lo que se ve en la foto (de describeProductImage) —
  // se la pasamos ya calculada en vez de que esta función reciba la imagen,
  // para que siga siendo una función de texto puro.
  imageDescription?: string;
};

// Selltrix genera una descripción larga con secciones bien separadas
// (¡Qué es el producto!, Acerca de este producto, Ventajas de comprarlo,
// Características, Se entrega con, Garantía, Política de devolución) — la
// descripción anterior era un solo párrafo corto + una lista, mucho más
// pobre. Le pedimos al modelo solo las secciones que sí puede redactar sin
// inventar nada (intro/about/ventajas/características, siempre basadas en
// keyFeatures) y las 3 secciones de política real las insertamos nosotros
// tal cual las escribió el vendedor.
export async function generateDetailedDescription(input: DetailedDescriptionInput): Promise<string | null> {
  const productName = input.productName.trim().slice(0, 200);
  const keyFeatures = input.keyFeatures.trim().slice(0, 800);
  if (!productName && !keyFeatures && !input.imageDescription?.trim()) return null;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1700,
    messages: [
      {
        role: "user",
        content: `Sos un experto en redacción de publicaciones de Mercado Libre (Latinoamérica). Necesito una descripción LARGA, extensa y muy detallada, basada SOLO en los datos reales que te paso — no inventes especificaciones, certificaciones, cifras ni efectos que no estén acá, pero SÍ desarrollá cada parte con el máximo detalle posible a partir de esos datos reales (no te quedes en frases genéricas cortas si hay algo real de qué hablar).

Datos del producto:
- Producto: "${productName || "(sin nombre)"}"
- Marca: ${input.brand?.trim() || "(no especificada)"}
- Categoría: ${input.category?.trim() || "(no especificada)"}
- Características/detalles reales que me pasa el vendedor: "${keyFeatures || "(no especificadas, usa solo el nombre del producto)"}"
${input.imageDescription?.trim() ? `- Lo que se ve realmente en la foto del producto: "${input.imageDescription.trim()}"` : ""}

Necesito estas partes, cada una más desarrollada y específica de lo habitual (no genérica ni de relleno):
- "intro": 2-3 frases tipo "qué es el producto" — directo, concreto, mencionando el tipo de producto y su función principal real.
- "about": un array de 3 párrafos (3-5 frases cada uno, no cortitos): el primero sobre para qué sirve y en qué situaciones/contextos concretos se usa; el segundo sobre la experiencia real de uso (comodidad, facilidad, resultado que obtiene quien lo usa, siempre anclado en las características reales que te pasé); el tercero profundizando en las características reales más relevantes y por qué importan para quien lo compra. Todo basado solo en los datos reales — si hay pocos datos, elaborá sobre lo que SÍ hay (el tipo de producto, su categoría, su uso típico) en vez de inventar specs.
- "advantages": 6 ventajas concretas de comprar este producto (frases completas, no solo 2-3 palabras — explicá brevemente el porqué de cada una). Pueden ser ventajas genéricas del tipo de producto si no hay más info (ej. "Libertad de movimiento sin cables, ideal para actividades diarias"), pero nunca inventando datos técnicos específicos.
- "features": 6 a 9 características concretas del producto, SOLO de los datos reales que te pasé (nombre, características, foto) — si hay pocos datos reales, priorizá exprimir al máximo lo que SÍ tenés (tipo de producto, categoría, cualquier atributo mencionado) antes de devolver una lista corta.

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto adicional:
{"intro": "...", "about": ["...", "...", "..."], "advantages": ["...", "...", "...", "...", "...", "..."], "features": ["...", "..."]}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (typeof parsed?.intro !== "string" || !Array.isArray(parsed?.about)) return null;

    const about: string[] = parsed.about.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0);
    const advantages: string[] = Array.isArray(parsed.advantages)
      ? parsed.advantages.filter((a: unknown): a is string => typeof a === "string" && a.trim().length > 0)
      : [];
    const features: string[] = Array.isArray(parsed.features)
      ? parsed.features.filter((f: unknown): f is string => typeof f === "string" && f.trim().length > 0)
      : [];

    const SEP = "\n\n-----------------------------\n\n";
    const sections: string[] = [`¡QUÉ ES EL PRODUCTO!\n${parsed.intro.trim()}`];

    if (about.length > 0) {
      sections.push(`ACERCA DE ESTE PRODUCTO\n${about.join("\n\n")}`);
    }
    if (advantages.length > 0) {
      sections.push(`VENTAJAS DE COMPRARLO\n${advantages.map((a) => `• ${a.trim()}`).join("\n")}`);
    }
    if (features.length > 0) {
      sections.push(`CARACTERÍSTICAS DEL PRODUCTO\n${features.map((f) => `• ${f.trim()}`).join("\n")}`);
    }
    if (input.includes?.trim()) {
      const items = input.includes
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      sections.push(`SE ENTREGA CON:\n${items.map((i) => `• ${i}`).join("\n")}`);
    }
    if (input.warranty?.trim()) {
      sections.push(`GARANTÍA\n${input.warranty.trim()}`);
    }
    if (input.returnPolicy?.trim()) {
      sections.push(`POLÍTICA DE DEVOLUCIÓN\n${input.returnPolicy.trim()}`);
    }

    return sections.join(SEP);
  } catch (err) {
    console.error("generateDetailedDescription: no se pudo parsear la respuesta del modelo:", text, err);
    return null;
  }
}

// El Optimizador SEO junta candidatos de varias fuentes (búsquedas
// relacionadas reales de la categoría vía /trends, + sinónimos de
// generateSearchTerms) — algunas de esas búsquedas reales de la categoría
// no tienen nada que ver con ESTE producto puntual (ej. buscar "audifonos"
// trae "airpods max" en las tendencias de la categoría, que es de otra
// marca). Este filtro es el que le da sentido a la etiqueta "Filtrados por
// IA": descarta lo que no aplica al producto concreto, no inventa nada
// nuevo.
export async function filterRelevantKeywords(productName: string, candidates: string[]): Promise<string[]> {
  const name = productName.trim().slice(0, 150);
  const list = candidates.map((c) => c.trim()).filter(Boolean).slice(0, 60);
  if (!name || list.length === 0) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Producto: "${name}".

Lista de términos de búsqueda candidatos (vienen de tendencias reales de Mercado Libre y de un generador de sinónimos, así que algunos no van a aplicar a este producto puntual):
${list.map((t) => `- ${t}`).join("\n")}

Devolveme SOLO los términos de esa lista que un comprador usaría para buscar ESTE producto específico (mismo tipo de producto, no otra marca/modelo distinto ni un producto no relacionado). No agregues términos nuevos que no estén en la lista, no reescribas los términos, solo filtrá.

Responde ÚNICAMENTE con un array JSON de strings (subconjunto exacto de la lista de arriba), sin texto adicional.`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(list.map((t) => t.toLowerCase()));
    return parsed
      .filter((t): t is string => typeof t === "string" && allowed.has(t.trim().toLowerCase()))
      .map((t) => t.trim());
  } catch (err) {
    console.error("filterRelevantKeywords: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}

export type SeoTitlesResult = {
  titles: string[];
  catalogTitle: string;
};

// A diferencia de un generador que inventa un único título sin ningún
// dato real de búsqueda, esta función recibe las keywords YA
// verificadas contra Mercado Libre (tendencias reales de la categoría +
// sinónimos filtrados) y les pide variantes de título que las usen — mismas
// reglas reales de título de Mercado Libre (60 caracteres, sin mayúsculas
// sostenidas ni palabras subjetivas), más un título largo "de catálogo"
// (hasta 120 caracteres) para la ficha de producto genérica.
export async function generateSeoTitles(input: {
  productName: string;
  keywords: string[];
  categoryName?: string;
  brand?: string;
  keyFeatures?: string;
  imageDescription?: string;
}): Promise<SeoTitlesResult | null> {
  const name = input.productName.trim().slice(0, 150);
  const keywords = input.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 25);
  const keyFeatures = input.keyFeatures?.trim().slice(0, 500) ?? "";
  const imageDescription = input.imageDescription?.trim().slice(0, 300) ?? "";
  if (!name) return null;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Sos un experto en optimización de publicaciones de Mercado Libre (Latinoamérica). Producto: "${name}". Marca: ${input.brand?.trim() || "(no especificada)"}. Categoría real de Mercado Libre: ${input.categoryName?.trim() || "(no detectada)"}.
${keyFeatures ? `Características reales que dio el vendedor: "${keyFeatures}"` : ""}
${imageDescription ? `Lo que se ve realmente en la foto: "${imageDescription}"` : ""}

Palabras clave reales de búsqueda para este producto (vienen de tendencias reales de Mercado Libre, ya filtradas para que apliquen a este producto):
${keywords.length > 0 ? keywords.map((k) => `- ${k}`).join("\n") : "(sin keywords reales, usa solo el nombre del producto)"}

Necesito 3 títulos de publicación optimizados y 1 título largo para catálogo — sé lo más detallado y denso posible en información real, aprovechando TODO el espacio de caracteres disponible (no dejes el título corto si hay más keywords/atributos reales para meter).

Reglas de los 3 títulos de publicación:
- Usá el máximo de caracteres posible, cerca del límite de 60 (no te quedes corto si hay keywords/atributos reales para agregar).
- Cada título combina una selección DISTINTA de 2-3 keywords reales de la lista (no las ignores, son búsquedas reales de compradores) + cualquier atributo real (marca/color/modelo/característica) que te haya dado el vendedor o la foto.
- Orden: Marca (si aplica) + Producto + Atributo clave + Cantidad si aplica. Las palabras que más se buscan van primero.
- SIN mayúsculas sostenidas, SIN emojis ni símbolos, SIN palabras subjetivas ("el mejor", "increíble"), SIN mencionar envío/garantía/promociones/precio.
- Los 3 títulos tienen que ser variantes genuinamente distintas (no la misma frase con una palabra cambiada) — cada uno resaltando un ángulo distinto (ej. uno enfocado en la marca/modelo, otro en un atributo real, otro en el uso).
- NUNCA inventes un atributo (color, capacidad, material) que no esté en las keywords, características o descripción de foto que te pasé.

Reglas del título de catálogo:
- Hasta 120 caracteres, usá la mayor cantidad posible combinando TODAS las keywords/atributos reales relevantes que entren, para maximizar qué búsquedas lo encuentran.
- Mismas reglas de qué NO incluir e no inventar que los títulos normales.

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto adicional:
{"titles": ["...", "...", "..."], "catalogTitle": "..."}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed?.titles) || typeof parsed?.catalogTitle !== "string") return null;
    return {
      titles: parsed.titles
        .filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t: string) => t.trim().slice(0, 60))
        .slice(0, 3),
      catalogTitle: parsed.catalogTitle.trim().slice(0, 120),
    };
  } catch (err) {
    console.error("generateSeoTitles: no se pudo parsear la respuesta del modelo:", text, err);
    return null;
  }
}

// Llamados cortos (tipo "badge") para la infografía de Beneficios — cada
// uno tiene que caber en una tarjeta chica sobre la foto, así que son
// frases de 2-4 palabras, no oraciones. Basados solo en lo que el usuario
// escribió, sin inventar especificaciones.
export async function generateCallouts(productName: string, keyFeatures: string): Promise<string[]> {
  const name = productName.trim().slice(0, 150);
  const features = keyFeatures.trim().slice(0, 800);
  if (!name && !features) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Para una infografía de Mercado Libre del producto "${name || "(sin nombre)"}", con estas características: "${features || "(sin características, usa el nombre como única referencia)"}".

Necesito 4 llamados cortos (2-4 palabras cada uno) para mostrar como badges sobre la foto del producto — el beneficio o característica más fuerte de cada uno, en lenguaje de venta directo pero SIN inventar nada que no esté en los datos. Ejemplos de formato: "Batería 7 días", "Resistente al agua", "Pantalla AMOLED", "Incluye 2 correas".

Responde ÚNICAMENTE con un array JSON de 4 strings cortos, sin texto adicional.`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim().slice(0, 30))
      .slice(0, 4);
  } catch (err) {
    console.error("generateCallouts: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}

export type InfographicSetCategory = "portada" | "producto" | "beneficios" | "comparacion" | "en_uso" | "aclaracion";

export type InfographicClaim = {
  category: InfographicSetCategory;
  headline: string;
  subtext: string;
  bullets: string[];
};

const INFOGRAPHIC_SET_CATEGORIES: { key: InfographicSetCategory; desc: string }[] = [
  { key: "portada", desc: "Portada minimalista tipo foto de catálogo — solo el producto centrado sobre un fondo limpio, SIN bullets de venta. El headline es opcional y muy corto (una palabra o el nombre de marca), puede ir vacío \"\"." },
  { key: "producto", desc: "Presentación limpia del producto — headline corto con el nombre/atributo principal, sin bullets de venta." },
  { key: "beneficios", desc: "El beneficio más fuerte como headline grande (ej. \"NO TIENE AZÚCAR\"), 3-4 bullets cortos de características/beneficios reales." },
  { key: "comparacion", desc: "Tabla \"headline vs otras marcas genéricas\" — 4-5 bullets de características donde el producto gana, en términos genéricos, SIN nombrar marcas de la competencia." },
  { key: "en_uso", desc: "Cómo se usa/consume el producto en la práctica — headline con el modo de uso, 2-3 bullets de contexto de uso." },
  { key: "aclaracion", desc: "Aclara un mito o preocupación común del rubro del producto (headline tipo \"NO DA ACNÉ\" o \"SIN CONTRAINDICACIONES\"), 2-3 bullets que lo respaldan." },
];

// Sugerencias de texto para el set de 5 infografías (producto, beneficios,
// comparación, en uso, aclaración) — el usuario SIEMPRE las revisa y edita
// antes de generar las imágenes reales, así que acá la IA puede proponer,
// pero nunca inventa specs/afirmaciones de salud que no estén implícitas en
// lo que el vendedor escribió.
export async function generateInfographicSetClaims(
  productName: string,
  keyFeatures: string,
): Promise<InfographicClaim[]> {
  const name = productName.trim().slice(0, 150);
  const features = keyFeatures.trim().slice(0, 800);
  if (!name && !features) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `Sos un diseñador de infografías de venta para Mercado Libre (Latinoamérica). Para el producto "${name || "(sin nombre)"}", con estas características/datos reales: "${features || "(sin datos adicionales, usa solo el nombre)"}".

Necesito una PROPUESTA de texto para un set de ${INFOGRAPHIC_SET_CATEGORIES.length} infografías, en este orden y con este propósito cada una:
${INFOGRAPHIC_SET_CATEGORIES.map((c, i) => `${i + 1}. ${c.key}: ${c.desc}`).join("\n")}

Reglas estrictas:
- SOLO usá datos/afirmaciones que estén en el nombre o las características que te pasé. Si no hay suficiente información para una categoría, proponé algo genérico y neutro (ej. "Calidad garantizada") en vez de inventar un dato específico (nunca inventes cifras, porcentajes, ingredientes, certificaciones o efectos que no te dieron).
- En "comparacion" nunca nombres una marca competidora real — usá términos genéricos como "otras marcas" u "otros productos".
- Los headlines van en MAYÚSCULAS, cortos (máximo 5-6 palabras). Los bullets son frases cortas (máximo 6-8 palabras cada una).
- "subtext" es una frase de apoyo opcional (puede ir vacía "").

Responde ÚNICAMENTE con un array JSON de ${INFOGRAPHIC_SET_CATEGORIES.length} objetos con esta forma exacta, en el mismo orden de la lista de arriba:
[{"category": "producto", "headline": "...", "subtext": "...", "bullets": ["...", "..."]}, ...]`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is InfographicClaim =>
          c &&
          typeof c.category === "string" &&
          typeof c.headline === "string" &&
          Array.isArray(c.bullets),
      )
      .map((c) => ({
        category: c.category as InfographicSetCategory,
        headline: c.headline.trim().slice(0, 80),
        subtext: typeof c.subtext === "string" ? c.subtext.trim().slice(0, 120) : "",
        bullets: c.bullets
          .filter((b: unknown): b is string => typeof b === "string" && b.trim().length > 0)
          .map((b: string) => b.trim().slice(0, 60))
          .slice(0, 5),
      }))
      .slice(0, INFOGRAPHIC_SET_CATEGORIES.length);
  } catch (err) {
    console.error("generateInfographicSetClaims: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}

type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function parseImageDataUrl(imageDataUrl: string): { mediaType: SupportedImageMediaType; base64: string } | null {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mediaType, base64] = match;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) return null;
  return { mediaType: mediaType as SupportedImageMediaType, base64 };
}

// Analiza la foto real del producto (visión de Claude, no un promedio de
// píxeles) y sugiere un color de acento que combine con el envase — más
// criterio que "el color más repetido", que suele ser el fondo blanco.
export async function suggestAccentColor(imageDataUrl: string): Promise<string | null> {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed) return null;
  const { mediaType, base64 } = parsed;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: `Mirá esta foto de un producto. Necesito UN color de acento (código hex) para usar en una infografía de venta de Mercado Libre — tiene que combinar bien con los colores reales del envase/etiqueta (puede ser un color que ya esté en el producto, o uno complementario que resalte sobre un fondo claro), y verse profesional (ni muy pálido ni neón).

Responde ÚNICAMENTE con el código hex en formato "#rrggbb", sin texto adicional.`,
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const hexMatch = text.match(/#[0-9a-fA-F]{6}/);
  return hexMatch ? hexMatch[0].toLowerCase() : null;
}

// Descripción factual de lo que se VE en la foto real (marca/logo visible,
// tipo de producto, color, accesorios/empaque a la vista) — la reutilizan
// el Optimizador SEO (como contexto extra para keywords/categoría) y el
// Generador de Descripciones (como dato real adicional, nunca inventado,
// para "acerca de"/"características"). A propósito le pedimos SOLO lo
// observable, no que infiera specs que no se puedan ver en la imagen.
export async function describeProductImage(imageDataUrl: string): Promise<string | null> {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed) return null;
  const { mediaType, base64 } = parsed;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: `Describí en 1-2 frases SOLO lo que se ve realmente en esta foto de un producto: qué tipo de producto es, marca/logo si es legible, color, y accesorios o empaque visibles. No inventes especificaciones técnicas que no se puedan ver a simple vista (nada de cifras, materiales, ni certificaciones que no estén escritas en la foto).

Responde solo con esa descripción, sin texto adicional.`,
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return text || null;
}
