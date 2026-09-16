import { auth } from "@/auth";
import { buildInfographicImageResponse } from "@/lib/infographic";

export const maxDuration = 30;

// El servidor va a hacer fetch de esta URL si viene imageUrl en vez de
// imageDataUrl — sin este chequeo, cualquier usuario logueado podría usar
// esta ruta para que nuestro servidor pida cualquier URL arbitraria (SSRF).
// Las miniaturas reales de Mercado Libre siempre viven en mlstatic.com.
function isAllowedImageHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    // Las miniaturas reales de ML a veces vienen en http:// (no https) —
    // el límite de seguridad real acá es el dominio, no el esquema.
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

  let body: { imageDataUrl?: string; imageUrl?: string; productName?: string; keyFeatures?: string; accentColor?: string };
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

  return buildInfographicImageResponse({
    imageDataUrl: hasUploadedImage ? body.imageDataUrl : undefined,
    imageUrl: hasRealImage ? body.imageUrl : undefined,
    productName: body.productName,
    keyFeatures: body.keyFeatures,
    accentColor: body.accentColor,
  });
}
