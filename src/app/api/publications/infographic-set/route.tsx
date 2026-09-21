import { auth } from "@/auth";
import { buildInfographicSetImage, isAllowedImageHost } from "@/lib/infographic-set";
import { buildAiPrompt, generateAiInfographic } from "@/lib/ai-infographic";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";

export const maxDuration = 60;

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

  // Placeholder temporal con IA (Cloudflare, gratis) mientras se evalúa una
  // IA de edición de paga — el modelo gratuito no garantiza preservar el
  // producto real, decisión explícita del usuario. Si falla (o el filtro de
  // seguridad la rechaza las 3 veces), cae al sistema seguro de siempre
  // (foto real + texto por código) para que la generación nunca se rompa.
  try {
    const prompt = buildAiPrompt(body.claim, body.productName || "el producto", accentColor);
    const bytes = await generateAiInfographic(imageSource, prompt);
    // TS marca los tipos de ArrayBufferLike/SharedArrayBuffer como
    // incompatibles con BlobPart en esta versión — a nivel runtime
    // Uint8Array real (nunca compartido) funciona sin problema.
    return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }), {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (err) {
    console.error(`generateAiInfographic(${body.claim.category}) failed, usando fallback seguro:`, err);
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
