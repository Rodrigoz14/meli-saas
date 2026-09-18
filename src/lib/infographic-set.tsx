import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";
import { generateBackgroundImage } from "@/lib/cloudflare-ai";
import { loadGoogleFontTtf } from "@/lib/og-font";

const SIZE = 1080;

export type InfographicSetInput = {
  imageDataUrl?: string;
  imageUrl?: string;
  claim: InfographicClaim;
  accentColor?: string;
};

export async function resolveImageDataUrl(input: { imageDataUrl?: string; imageUrl?: string }): Promise<string> {
  if (input.imageDataUrl) return input.imageDataUrl;
  if (!input.imageUrl) throw new Error("Falta la foto del producto");

  const res = await fetch(input.imageUrl);
  if (!res.ok) throw new Error("No se pudo traer la foto de la publicación");
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

// Prompts de FONDO únicamente — a propósito nunca le piden a la IA que
// dibuje el producto, texto, personas ni marcas: eso siempre se compone
// aparte (foto real + texto con next/og) para no arriesgar una etiqueta o
// dato mal renderizado por el modelo de imagen.
const BACKGROUND_PROMPTS: Record<InfographicSetCategory, string> = {
  producto:
    "professional product photography studio background, soft clean gradient, minimalist, high-end commercial lighting, empty background, no text, no objects, no people",
  beneficios:
    "abstract professional wellness background, soft light rays, modern gradient, clean and energetic, empty background, no text, no objects, no people",
  comparacion:
    "dramatic professional dark background, versus battle concept, sharp diagonal light beam through center, empty background, no text, no objects, no people",
  en_uso:
    "soft blurred lifestyle background, gym or kitchen ambient, warm natural light, empty background, no text, no sharp objects, no people in focus",
  aclaracion:
    "trustworthy calm professional background, soft gradient, subtle security and safety mood, empty background, no text, no objects, no people",
};

// Nunca pasarle el hex crudo (ej. "#5670f0") al prompt: FLUX a veces lo
// interpreta como texto literal para escribir dentro de la imagen. Un
// nombre de color en inglés evita ese problema.
const ACCENT_COLOR_NAMES: Record<string, string> = {
  "#5670f0": "indigo blue",
  "#10b981": "emerald green",
  "#f5a524": "warm amber",
  "#f43f5e": "rose pink",
};

function backgroundPrompt(category: InfographicSetCategory, accentColor: string): string {
  const colorName = ACCENT_COLOR_NAMES[accentColor.toLowerCase()] || "blue";
  return `${BACKGROUND_PROMPTS[category]}, color palette centered on ${colorName} tones, no text, no watermark, no numbers, no letters`;
}

async function loadInputs(input: InfographicSetInput) {
  const accentColor = input.accentColor || "#5670f0";
  const [imageDataUrl, backgroundDataUrl, fontRegular, fontBold] = await Promise.all([
    resolveImageDataUrl(input),
    generateBackgroundImage(backgroundPrompt(input.claim.category, accentColor)).catch((err) => {
      console.error("generateBackgroundImage failed, usando gradiente de respaldo:", err);
      return null;
    }),
    loadGoogleFontTtf("Inter", 400),
    loadGoogleFontTtf("Inter", 700),
  ]);
  return { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold };
}

function fonts(fontRegular: ArrayBuffer, fontBold: ArrayBuffer) {
  return [
    { name: "Inter", data: fontRegular, weight: 400 as const },
    { name: "Inter", data: fontBold, weight: 700 as const },
  ];
}

// Íconos dibujados en SVG (no caracteres de texto) — el subset de la fuente
// Inter que baja Google Fonts no trae glifos como ✓/✗, y Satori los
// renderiza como cuadros vacíos. Un SVG siempre se ve igual sin depender de
// qué glifos incluya la fuente.
function CheckIcon({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Frame({
  backgroundDataUrl,
  accentColor,
  children,
}: {
  backgroundDataUrl: string | null;
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: "flex",
        position: "relative",
        fontFamily: "Inter",
        background: backgroundDataUrl
          ? "#0f172a"
          : `linear-gradient(135deg, ${accentColor}22 0%, #0f172a 100%)`,
      }}
    >
      {backgroundDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundDataUrl}
          alt=""
          width={SIZE}
          height={SIZE}
          style={{ position: "absolute", inset: 0, width: SIZE, height: SIZE, objectFit: "cover" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,10,20,0.35)" }} />
      {children}
    </div>
  );
}

function ProductCard({ src, size = 480 }: { src: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: "white",
        borderRadius: 32,
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={size - 60} height={size - 60} style={{ objectFit: "contain" }} />
    </div>
  );
}

// 1. PRODUCTO — presentación limpia: foto real grande, headline chico.
export async function buildProductInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext } = input.claim;

  return new ImageResponse(
    (
      <Frame backgroundDataUrl={backgroundDataUrl} accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
          }}
        >
          <ProductCard src={imageDataUrl} size={600} />
          {headline && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 880,
                gap: 8,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: 44,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: -1,
                }}
              >
                {headline}
              </div>
              {subtext && (
                <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: "rgba(255,255,255,0.85)" }}>
                  {subtext}
                </div>
              )}
            </div>
          )}
        </div>
      </Frame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 2. BENEFICIOS — headline grande + checklist de bullets, foto al costado.
export async function buildBenefitsInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <Frame backgroundDataUrl={backgroundDataUrl} accentColor={accentColor}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: 70 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 560, gap: 28 }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "white", lineHeight: 1.05 }}>
              {headline}
            </div>
            {subtext && (
              <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.85)" }}>{subtext}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
              {bullets.slice(0, 4).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 999,
                      background: accentColor,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckIcon size={20} />
                  </div>
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "white" }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ProductCard src={imageDataUrl} size={460} />
          </div>
        </div>
      </Frame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 3. COMPARACIÓN — headline + tabla "producto" vs "otras marcas".
export async function buildComparisonInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, bullets } = input.claim;

  return new ImageResponse(
    (
      <Frame backgroundDataUrl={backgroundDataUrl} accentColor={accentColor}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: 60, gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "white", textAlign: "center" }}>
              {headline}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
            <ProductCard src={imageDataUrl} size={260} />
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: accentColor }}>VS</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 260,
                height: 260,
                borderRadius: 32,
                background: "rgba(255,255,255,0.08)",
                border: "2px dashed rgba(255,255,255,0.3)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 22,
                fontWeight: 700,
                textAlign: "center",
                padding: 20,
              }}
            >
              Otras marcas
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
              marginTop: 8,
            }}
          >
            {bullets.slice(0, 5).map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 28px",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "white", flex: 1 }}>{b}</div>
                <div style={{ display: "flex", gap: 40 }}>
                  <div
                    style={{
                      display: "flex",
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "rgba(34,197,94,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckIcon size={18} color="#22c55e" />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "rgba(239,68,68,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CrossIcon size={18} color="#ef4444" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 4. EN USO — headline con el modo de uso + bullets de contexto.
export async function buildUsageInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <Frame backgroundDataUrl={backgroundDataUrl} accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            padding: 60,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 880,
              textAlign: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
                fontSize: 48,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.1,
              }}
            >
              {headline}
            </div>
            {subtext && (
              <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: "rgba(255,255,255,0.85)" }}>
                {subtext}
              </div>
            )}
          </div>

          <ProductCard src={imageDataUrl} size={480} />

          <div style={{ display: "flex", gap: 20 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 999,
                  padding: "12px 22px",
                  border: `1px solid ${accentColor}`,
                }}
              >
                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "white" }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 5. ACLARACIÓN — headline tipo "mito resuelto" + bullets de respaldo.
export async function buildClarificationInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, backgroundDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <Frame backgroundDataUrl={backgroundDataUrl} accentColor={accentColor}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: 70 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 560, gap: 24 }}>
            <div
              style={{
                display: "flex",
                width: 64,
                height: 64,
                borderRadius: 999,
                background: accentColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckIcon size={32} />
            </div>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "white", lineHeight: 1.05 }}>
              {headline}
            </div>
            {subtext && (
              <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.85)" }}>{subtext}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              {bullets.slice(0, 3).map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: "14px 20px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "white" }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ProductCard src={imageDataUrl} size={460} />
          </div>
        </div>
      </Frame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

const BUILDERS: Record<InfographicSetCategory, (input: InfographicSetInput) => Promise<Response>> = {
  producto: buildProductInfographic,
  beneficios: buildBenefitsInfographic,
  comparacion: buildComparisonInfographic,
  en_uso: buildUsageInfographic,
  aclaracion: buildClarificationInfographic,
};

export async function buildInfographicSetImage(input: InfographicSetInput): Promise<Response> {
  const builder = BUILDERS[input.claim.category];
  if (!builder) throw new Error(`Categoría de infografía desconocida: ${input.claim.category}`);
  return builder(input);
}
