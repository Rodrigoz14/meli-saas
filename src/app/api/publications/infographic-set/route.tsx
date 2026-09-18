import { auth } from "@/auth";
import { buildInfographicSetImage } from "@/lib/infographic-set";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";

export const maxDuration = 30;

const VALID_CATEGORIES: InfographicSetCategory[] = ["producto", "beneficios", "comparacion", "en_uso", "aclaracion"];

// Mismo límite que /api/publications/infographic — las miniaturas reales de
// Mercado Libre siempre viven en mlstatic.com, así que solo eso se permite
// para evitar que esta ruta sirva de SSRF hacia cualquier URL arbitraria.
function isAllowedImageHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && /(^|\.)mlstatic\.com$/.test(hostname);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    imageDataUrl?: string;
    imageUrl?: string;
    accentColor?: string;
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
