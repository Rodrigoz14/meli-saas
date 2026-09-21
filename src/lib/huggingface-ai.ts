// Recorte de fondo real (no generativo) — BRIA RMBG-2.0 vía Hugging Face
// Inference Providers (fal-ai). A diferencia de un modelo de edición, un
// modelo de segmentación no "reinterpreta" la imagen: solo separa producto
// de fondo, pixel por pixel — la etiqueta/foto real queda intacta.
export async function removeBackground(imageDataUrl: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    throw new Error("Hugging Face no está configurado (falta HUGGINGFACE_API_TOKEN)");
  }

  const res = await fetch("https://router.huggingface.co/fal-ai/fal-ai/bria/background/remove", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageDataUrl }),
  });
  if (!res.ok) {
    throw new Error(`Hugging Face remove-bg ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const resultUrl: string | undefined = data?.image?.url;
  if (!resultUrl) {
    throw new Error("Hugging Face remove-bg no devolvió una imagen");
  }

  const imgRes = await fetch(resultUrl);
  if (!imgRes.ok) throw new Error("No se pudo descargar el recorte de Hugging Face");
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}
