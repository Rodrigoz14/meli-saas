import { auth } from "@/auth";
import { buildInfographicSetImage, isAllowedImageHost } from "@/lib/infographic-set";
import { buildAiPrompt } from "@/lib/ai-infographic";
import { generateHiggsfieldInfographic } from "@/lib/higgsfield-ai";
import { hasReachedDailyInfographicLimit, recordInfographicGeneration } from "@/lib/infographic-limit";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";

// Higgsfield (marketing-studio/image, calidad alta 2k) tarda entre 60 y
// 120s en generar, muy por encima de los 60s que teníamos — Vercel corta la
// función a los 60s y el fetch del cliente queda sin respuesta (por eso
// algunas infografías generaban bien y otras se veían vacías, según cuánto
// tardara esa generación puntual).
export const maxDuration = 180;

const VALID_CATEGORIES: InfographicSetCategory[] = ["producto", "beneficios", "comparacion", "en_uso", "aclaracion"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    imageDataUrl?: string;
    imageUrl?: string;
    accentColor?: string;
    productName?: string;
    claim?: InfographicClaim;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  const hasUploadedImage = Boolean(body.imageDataUrl?.startsWith("data:image/"));
  const hasRealImage = Boolean(body.imageUrl && isAllowedImageHost(body.imageUrl));
  if (!hasUploadedImage && !hasRealImage) {
    return Response.json({ error: "Falta la foto del producto" }, { status: 400 });
  }

  if (!body.claim || !VALID_CATEGORIES.includes(body.claim.category)) {
    return Response.json({ error: "Categoría de infografía inválida" }, { status: 400 });
  }

  const accentColor = body.accentColor || "#5670f0";
  const imageSource = hasUploadedImage ? body.imageDataUrl! : body.imageUrl!;

  // IA de paga (Higgsfield) que sí preserva el producto real, a diferencia
  // del placeholder anterior con Cloudflare. El tope diario por usuario
  // protege el presupuesto: al llegar al límite se salta directo al
  // fallback seguro (gratis) en vez de seguir gastando. Si Higgsfield falla
  // por cualquier otro motivo, también cae al mismo fallback para que la
  // generación nunca se rompa del todo.
  const limitReached = await hasReachedDailyInfographicLimit(session.user.id);
  if (!limitReached) {
    try {
      const prompt = buildAiPrompt(body.claim, body.productName || "el producto", accentColor);
      const { bytes, sourceUrl, contentType } = await generateHiggsfieldInfographic(imageSource, prompt);
      await recordInfographicGeneration(session.user.id, sourceUrl);
      // TS marca los tipos de ArrayBufferLike/SharedArrayBuffer como
      // incompatibles con BlobPart en esta versión — a nivel runtime
      // Uint8Array real (nunca compartido) funciona sin problema.
      return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: contentType }), {
        headers: { "Content-Type": contentType, "X-Infographic-Source": "ai" },
      });
    } catch (err) {
      console.error(`generateHiggsfieldInfographic(${body.claim.category}) failed, usando fallback seguro:`, err);
    }
  }

  try {
    return await buildInfographicSetImage({
      imageDataUrl: hasUploadedImage ? body.imageDataUrl : undefined,
      imageUrl: hasRealImage ? body.imageUrl : undefined,
      accentColor: body.accentColor,
      claim: body.claim,
    });
  } catch (err) {
    console.error(`buildInfographicSetImage(${body.claim.category}) failed:`, err);
    return Response.json({ error: "No se pudo generar la infografía" }, { status: 500 });
  }
}
