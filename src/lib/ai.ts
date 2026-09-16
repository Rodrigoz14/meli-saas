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
