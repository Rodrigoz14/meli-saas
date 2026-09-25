import { randomUUID } from "crypto";
import { config, higgsfield, type V2Response } from "@higgsfield/client/v2";
import { put } from "@vercel/blob";
import { dataUrlToBuffer } from "@/lib/ai-infographic";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials) throw new Error("Higgsfield no está configurado (falta HF_CREDENTIALS)");
  config({ credentials });
  configured = true;
}

// Higgsfield pide una URL pública que sus servidores puedan bajar (no acepta
// bytes ni base64) — si el usuario subió una foto propia (data URL), hay que
// alojarla primero en Vercel Blob; si ya es una foto real de Mercado Libre
// (URL http ya pública), se pasa tal cual, sin subir nada.
async function ensurePublicImageUrl(imageSource: string): Promise<string> {
  if (!imageSource.startsWith("data:")) return imageSource;
  const { buffer, mimeType } = await dataUrlToBuffer(imageSource);
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const blob = await put(`higgsfield-tmp/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
  });
  return blob.url;
}

// `subscribe(..., { withPolling: true })` no lanza error en un resultado
// "failed"/"nsfw" — devuelve la respuesta igual, con `error` en el body
// (no declarado en el tipo V2Response del SDK, pero sí viene en el JSON
// real), así que hay que chequear el status a mano.
type V2ResponseWithError = V2Response & { error?: string };

export type HiggsfieldInfographicResult = { bytes: Uint8Array; sourceUrl: string };

export async function generateHiggsfieldInfographic(
  imageSource: string,
  prompt: string,
): Promise<HiggsfieldInfographicResult> {
  ensureConfigured();
  const imageUrl = await ensurePublicImageUrl(imageSource);

  const result = (await higgsfield.subscribe("marketing-studio/image", {
    input: {
      prompt,
      image_urls: [imageUrl],
      enhance_prompt: false,
      resolution: "2k",
      aspect_ratio: "1:1",
      moderation: "auto",
    },
    withPolling: true,
  })) as V2ResponseWithError;

  if (result.status !== "completed" || !result.images?.[0]?.url) {
    throw new Error(`Higgsfield ${result.status}: ${result.error ?? "no devolvió una imagen"}`);
  }

  const sourceUrl = result.images[0].url;
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen generada por Higgsfield (${res.status})`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), sourceUrl };
}
