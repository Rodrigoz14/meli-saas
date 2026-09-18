// Fondos generados con IA real (Cloudflare Workers AI, FLUX.1 [schnell]) —
// nunca se le pide que dibuje el producto ni texto: solo un fondo/escena
// decorativa. La foto real del producto y todo el texto/tablas se componen
// aparte con next/og (Satori), así no hay riesgo de que la IA invente o
// deforme una etiqueta/dato real.
export async function generateBackgroundImage(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Workers AI no está configurado (falta CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN)");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, steps: 6 }),
    },
  );

  if (!res.ok) {
    throw new Error(`Cloudflare Workers AI ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const base64 = data?.result?.image;
  if (typeof base64 !== "string" || !base64) {
    throw new Error("Cloudflare Workers AI no devolvió una imagen");
  }
  return `data:image/jpeg;base64,${base64}`;
}
