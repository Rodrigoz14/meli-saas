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
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Un vendedor de Mercado Libre (Latinoamérica) quiere investigar el nicho "${trimmed}". Dame 3 términos de búsqueda alternativos que un comprador real escribiría para encontrar el mismo tipo de producto (sinónimos, nombres alternativos, variaciones comunes o marcas genéricas del rubro) — NO productos distintos, NO accesorios. Responde ÚNICAMENTE con un array JSON de 3 strings cortos (2-4 palabras cada uno), sin texto adicional. Ejemplo para "reloj": ["smartwatch", "reloj inteligente", "reloj digital"]`,
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
      .slice(0, 3);
  } catch (err) {
    console.error("generateSearchTerms: no se pudo parsear la respuesta del modelo:", text, err);
    return [];
  }
}
