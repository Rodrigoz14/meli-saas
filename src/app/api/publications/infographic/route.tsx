import { auth } from "@/auth";
import { buildInfographicImageResponse } from "@/lib/infographic";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { imageDataUrl?: string; productName?: string; keyFeatures?: string; accentColor?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.imageDataUrl || !body.imageDataUrl.startsWith("data:image/")) {
    return Response.json({ error: "Falta la foto del producto" }, { status: 400 });
  }

  return buildInfographicImageResponse({
    imageDataUrl: body.imageDataUrl,
    productName: body.productName,
    keyFeatures: body.keyFeatures,
    accentColor: body.accentColor,
  });
}
