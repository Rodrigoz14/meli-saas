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
