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

export type PublicationCopyInput = {
  currentTitle: string;
  keyFeatures: string;
  brand?: string;
  category?: string;
};

export type PublicationCopy = {
  title: string;
  titleReasoning: string;
  description: string;
};

// Título y descripción optimizados para Mercado Libre, siguiendo sus
// reglas reales de publicación (no un texto de marketing genérico):
// orden Marca+Producto+Modelo+Atributo clave+Cantidad, sin mayúsculas
// sostenidas, sin palabras subjetivas ("el mejor", "increíble"), sin
// emojis/símbolos, sin mencionar envío/garantía/promociones (Mercado
// Libre rechaza publicaciones que lo hacen), y dentro del límite real de
// caracteres del título (~60).
export async function generatePublicationCopy(input: PublicationCopyInput): Promise<PublicationCopy | null> {
  const currentTitle = input.currentTitle.trim().slice(0, 200);
  const keyFeatures = input.keyFeatures.trim().slice(0, 800);
  if (!currentTitle && !keyFeatures) return null;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: `Sos un experto en optimización de publicaciones de Mercado Libre (Latinoamérica). Te paso los datos de un producto y necesito un título optimizado y una descripción, siguiendo las reglas REALES de Mercado Libre (no marketing genérico):

Reglas del título:
- Máximo 60 caracteres.
- Orden: Marca (si aplica) + Producto + Modelo/Variante + Atributo clave (color/tamaño/material) + Cantidad si aplica.
- Las palabras que más buscaría un comprador van primero.
- SIN mayúsculas sostenidas, SIN emojis ni símbolos (~ * ¡ ¡), SIN palabras subjetivas ("el mejor", "increíble", "calidad premium"), SIN mencionar envío/garantía/promociones/precio (Mercado Libre rechaza publicaciones que lo hacen en el título).
- No repetir palabras.

Reglas de la descripción:
- Empieza con 1-2 frases que resuelvan qué problema soluciona el producto (sin adjetivos vacíos).
- Sigue con una lista de características/beneficios concretos (viñetas con "•"), basados SOLO en los datos que te doy — no inventes especificaciones que no te pasé.
- Cierra con una línea de "Qué incluye" si se puede inferir de los datos.
- Tono directo y claro, sin superlativos vacíos.

Datos del producto:
- Título actual (puede estar mal optimizado, es solo referencia): "${currentTitle || "(sin título actual)"}"
- Marca: ${input.brand?.trim() || "(no especificada)"}
- Categoría: ${input.category?.trim() || "(no especificada)"}
- Características/detalles que me pasa el vendedor: "${keyFeatures || "(no especificadas, usa el título actual como única referencia)"}"

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto adicional:
{"title": "...", "titleReasoning": "una frase corta explicando por qué ese orden/esas palabras", "description": "..."}`,
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
    if (typeof parsed?.title !== "string" || typeof parsed?.description !== "string") return null;
    return {
      title: parsed.title.trim().slice(0, 60),
      titleReasoning: typeof parsed.titleReasoning === "string" ? parsed.titleReasoning.trim() : "",
      description: parsed.description.trim(),
    };
  } catch (err) {
    console.error("generatePublicationCopy: no se pudo parsear la respuesta del modelo:", text, err);
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

export type InfographicSetCategory =
  | "producto"
  | "beneficios"
  | "comparacion"
  | "en_uso"
  | "aclaracion"
  | "rendimiento"
  | "instrucciones"
  | "confianza"
  | "producto_limpio"
  | "composicion"
  | "publico_objetivo"
  | "versatilidad"
  | "etiqueta";

export type InfographicClaim = {
  category: InfographicSetCategory;
  headline: string;
  subtext: string;
  bullets: string[];
};

const INFOGRAPHIC_SET_CATEGORIES: { key: InfographicSetCategory; desc: string }[] = [
  { key: "producto", desc: "Presentación limpia del producto — headline corto con el nombre/atributo principal, sin bullets de venta." },
  { key: "beneficios", desc: "El beneficio más fuerte como headline grande (ej. \"NO TIENE AZÚCAR\"), 3-4 bullets cortos de características/beneficios reales." },
  { key: "comparacion", desc: "Tabla \"headline vs otras marcas genéricas\" — 4-5 bullets de características donde el producto gana, en términos genéricos, SIN nombrar marcas de la competencia." },
  { key: "en_uso", desc: "Cómo se usa/consume el producto en la práctica — headline con el modo de uso, 2-3 bullets de contexto de uso." },
  { key: "aclaracion", desc: "Aclara un mito o preocupación común del rubro del producto (headline tipo \"NO DA ACNÉ\" o \"SIN CONTRAINDICACIONES\"), 2-3 bullets que lo respaldan." },
  { key: "rendimiento", desc: "Destaca cuánto rinde/dura el producto (headline con el número real de porciones/usos/días si el vendedor lo dio, ej. \"RINDE 10 PORCIONES\"), 2-3 bullets sobre esa duración." },
  { key: "instrucciones", desc: "Modo de uso/dosis real (headline tipo \"TOMA 1 CÁPSULA AL DÍA\" con la dosis que dio el vendedor), 2-3 bullets con detalles de uso (cuándo, cómo, con qué)." },
  { key: "confianza", desc: "Confianza/origen genérico (headline tipo \"CALIDAD GARANTIZADA\" o el país de origen si se dio), 2-3 bullets de respaldo SIN inventar certificaciones, premios ni normas que no te dieron." },
  { key: "producto_limpio", desc: "Foto de producto sola, minimalista, casi sin texto — solo el nombre o un atributo de una palabra, sin bullets." },
  { key: "composicion", desc: "Desglose de 3-4 ingredientes/componentes reales del producto (headline \"QUÉ CONTIENE\"), cada bullet es un ingrediente + su función, SOLO si el vendedor los mencionó." },
  { key: "publico_objetivo", desc: "Para quién es ideal el producto (headline tipo \"IDEAL PARA...\" con el público real que dio el vendedor), 2-3 bullets de por qué les sirve. No se muestran personas ni rostros en esta pieza, así que el texto no debe asumir que hay una foto de gente." },
  { key: "versatilidad", desc: "Flexibilidad de uso/preparación (headline tipo \"USALO COMO QUIERAS\"), 2-3 bullets con las distintas formas reales de usarlo que dio el vendedor." },
  { key: "etiqueta", desc: "Presentación clara de la información real del empaque/etiqueta (headline \"INFORMACIÓN DEL PRODUCTO\"), bullets con datos reales del empaque (contenido neto, presentación, etc.), nunca inventados." },
];

// Sugerencias de texto para el set de 13 infografías (producto, beneficios,
// comparación, en uso, aclaración, rendimiento, instrucciones, confianza,
// producto limpio, composición, público objetivo, versatilidad, etiqueta) —
// el usuario SIEMPRE las revisa y edita antes de generar las imágenes
// reales, así que acá la IA puede proponer, pero nunca inventa specs/
// afirmaciones de salud que no estén implícitas en lo que el vendedor
// escribió.
export async function generateInfographicSetClaims(
  productName: string,
  keyFeatures: string,
): Promise<InfographicClaim[]> {
  const name = productName.trim().slice(0, 150);
  const features = keyFeatures.trim().slice(0, 800);
  if (!name && !features) return [];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Sos un diseñador de infografías de venta para Mercado Libre (Latinoamérica). Para el producto "${name || "(sin nombre)"}", con estas características/datos reales: "${features || "(sin datos adicionales, usa solo el nombre)"}".

Necesito una PROPUESTA de texto para un set de ${INFOGRAPHIC_SET_CATEGORIES.length} infografías, en este orden y con este propósito cada una:
${INFOGRAPHIC_SET_CATEGORIES.map((c, i) => `${i + 1}. ${c.key}: ${c.desc}`).join("\n")}

Reglas estrictas:
- SOLO usá datos/afirmaciones que estén en el nombre o las características que te pasé. Si no hay suficiente información para una categoría, proponé algo genérico y neutro (ej. "Calidad garantizada") en vez de inventar un dato específico (nunca inventes cifras, porcentajes, ingredientes, certificaciones o efectos que no te dieron).
- En "comparacion" nunca nombres una marca competidora real — usá términos genéricos como "otras marcas" u "otros productos".
- En "rendimiento", "instrucciones" y "composicion": si no tenés el dato real (porciones, dosis, ingredientes), proponé un headline genérico sin número ni ingrediente específico inventado.
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

// Analiza la foto real del producto (visión de Claude, no un promedio de
// píxeles) y sugiere un color de acento que combine con el envase — más
// criterio que "el color más repetido", que suele ser el fondo blanco.
export async function suggestAccentColor(imageDataUrl: string): Promise<string | null> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mediaType, base64] = match;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mediaType)) return null;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } },
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
