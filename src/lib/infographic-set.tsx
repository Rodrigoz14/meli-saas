import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";
import { loadGoogleFontTtf } from "@/lib/og-font";

const SIZE = 1080;
const INK = "#0f172a";
const MUTED = "#64748b";

export type InfographicSetInput = {
  imageDataUrl?: string;
  imageUrl?: string;
  claim: InfographicClaim;
  accentColor?: string;
};

// Las miniaturas/fotos reales de Mercado Libre siempre viven en
// mlstatic.com — sin este chequeo, un usuario logueado podría usar el flujo
// de infografías para que nuestro servidor haga fetch de cualquier URL
// arbitraria (SSRF).
export function isAllowedImageHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && /(^|\.)mlstatic\.com$/.test(hostname);
  } catch {
    return false;
  }
}

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

// Plus Jakarta Sans — la misma tipografía de marca que ya usa el dashboard
// (ver layout.tsx), en vez de Inter genérica. Da más carácter a los
// headlines sin arriesgar nada (es texto real, renderizado por código).
const FONT_FAMILY = "Plus Jakarta Sans";

async function loadInputs(input: InfographicSetInput) {
  const accentColor = input.accentColor || "#5670f0";
  const [imageDataUrl, fontRegular, fontBold] = await Promise.all([
    resolveImageDataUrl(input),
    loadGoogleFontTtf(FONT_FAMILY, 500),
    loadGoogleFontTtf(FONT_FAMILY, 800),
  ]);
  return { accentColor, imageDataUrl, fontRegular, fontBold };
}

function fonts(fontRegular: ArrayBuffer, fontBold: ArrayBuffer) {
  return [
    { name: FONT_FAMILY, data: fontRegular, weight: 500 as const },
    { name: FONT_FAMILY, data: fontBold, weight: 800 as const },
  ];
}

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

// Fondo limpio (gradiente radial claro hacia el color de acento) — nada de
// escenas fotográficas generadas por IA: las referencias reales que pidió
// igualar el usuario son todas así, el peso visual está en el layout, no en
// el fondo.
function GradientFrame({ accentColor, children }: { accentColor: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: "flex",
        position: "relative",
        fontFamily: FONT_FAMILY,
        background: `radial-gradient(ellipse 900px 700px at 50% -8%, ${accentColor}30, white 62%)`,
      }}
    >
      {children}
    </div>
  );
}

// Barra superior de color sólido con el titular — el mismo recurso que
// usan las referencias (banner azul con texto blanco en mayúsculas).
function Banner({ text, accentColor }: { text: string; accentColor: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
        borderRadius: 20,
        padding: "22px 40px",
        boxShadow: `0 18px 36px -14px ${accentColor}aa`,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "center",
          fontSize: 34,
          fontWeight: 800,
          color: "white",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// Producto "flotando" sobre el fondo con una sombra elíptica abajo — en vez
// de la caja blanca pesada de antes, más parecido a foto de producto real.
function FloatingProduct({ src, size = 420 }: { src: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={size} height={size} style={{ objectFit: "contain" }} />
      <div
        style={{
          display: "flex",
          width: size * 0.68,
          height: 34,
          marginTop: -17,
          borderRadius: 999,
          background:
            "radial-gradient(ellipse, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0.1) 45%, rgba(15,23,42,0) 72%)",
        }}
      />
    </div>
  );
}

function IconRow({
  icon,
  text,
  accentColor,
}: {
  icon: ReactNode;
  text: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        background: "white",
        borderRadius: 18,
        padding: "16px 22px",
        boxShadow: "0 8px 24px -16px rgba(15,23,42,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
          boxShadow: `0 6px 14px -4px ${accentColor}88`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", fontSize: 25, fontWeight: 800, color: INK }}>{text}</div>
    </div>
  );
}

// 1. PRODUCTO — presentación limpia: foto flotando, nombre debajo.
export async function buildProductInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: SIZE,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <FloatingProduct src={imageDataUrl} size={560} />
          {headline && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 880,
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 880,
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: 42,
                  fontWeight: 800,
                  color: INK,
                  letterSpacing: -0.5,
                }}
              >
                {headline}
              </div>
              {subtext && (
                <div
                  style={{
                    display: "flex",
                    width: 880,
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: 24,
                    fontWeight: 500,
                    color: MUTED,
                  }}
                >
                  {subtext}
                </div>
              )}
            </div>
          )}
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 2. BENEFICIOS — banner superior + producto + fila de íconos con beneficios.
export async function buildBenefitsInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "64px 70px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", width: 940 }}>
            <Banner text={headline} accentColor={accentColor} />
          </div>
          {subtext && (
            <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 22, fontWeight: 500, color: MUTED, textAlign: "center" }}>{subtext}</div>
          )}

          <FloatingProduct src={imageDataUrl} size={340} />

          <div style={{ display: "flex", flexDirection: "column", width: 780, gap: 14, marginTop: 8 }}>
            {bullets.slice(0, 4).map((b, i) => (
              <IconRow key={i} icon={<CheckIcon size={22} />} text={b} accentColor={accentColor} />
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 3. COMPARACIÓN — nuestro producto vs "otras marcas", tabla de check/cross.
export async function buildComparisonInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "56px 70px",
            gap: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 940,
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              color: INK,
              textAlign: "center",
            }}
          >
            {headline}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, width: 940 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 420,
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 420,
                  height: 240,
                  background: "white",
                  borderRadius: 24,
                  boxShadow: "0 14px 30px -18px rgba(15,23,42,0.4)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDataUrl} alt="" width={340} height={200} style={{ objectFit: "contain" }} />
              </div>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: accentColor }}>
                NUESTRO PRODUCTO
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: 999,
                background: INK,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                color: "white",
                marginTop: -30,
                boxShadow: "0 10px 24px -10px rgba(15,23,42,0.5)",
              }}
            >
              VS
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 420,
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 420,
                  height: 240,
                  background: "#e5e7eb",
                  borderRadius: 24,
                  border: "2px dashed #cbd5e1",
                }}
              >
                <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: "#94a3b8" }}>Otras marcas</div>
              </div>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: "#94a3b8" }}>
                OTRAS MARCAS
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 940,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 10px 30px -18px rgba(15,23,42,0.35)",
              marginTop: 4,
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
                  background: i % 2 === 0 ? "white" : "#f8fafc",
                }}
              >
                <div style={{ display: "flex", fontSize: 23, fontWeight: 800, color: INK, flex: 1 }}>{b}</div>
                <div style={{ display: "flex", width: 90, justifyContent: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "#dcfce7",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckIcon size={18} color="#16a34a" />
                  </div>
                </div>
                <div style={{ display: "flex", width: 90, justifyContent: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "#f1f5f9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CrossIcon size={18} color="#94a3b8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 4. EN USO — banner + producto + pills de contexto de uso.
export async function buildUsageInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: SIZE,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 70px",
            gap: 30,
          }}
        >
          <div style={{ display: "flex", width: 940 }}>
            <Banner text={headline} accentColor={accentColor} />
          </div>
          {subtext && <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 22, fontWeight: 500, color: MUTED, textAlign: "center" }}>{subtext}</div>}

          <FloatingProduct src={imageDataUrl} size={420} />

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: 940, gap: 16 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "white",
                  borderRadius: 999,
                  padding: "14px 24px",
                  boxShadow: "0 8px 20px -14px rgba(15,23,42,0.4)",
                }}
              >
                <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: INK }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 5. ACLARACIÓN — banner + checklist de respaldo + producto.
export async function buildClarificationInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "64px 70px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", width: 940 }}>
            <Banner text={headline} accentColor={accentColor} />
          </div>
          {subtext && (
            <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 22, fontWeight: 500, color: MUTED, textAlign: "center" }}>{subtext}</div>
          )}

          <FloatingProduct src={imageDataUrl} size={320} />

          <div style={{ display: "flex", flexDirection: "column", width: 780, gap: 14 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <IconRow key={i} icon={<CheckIcon size={22} />} text={b} accentColor={accentColor} />
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 6-9. Genérico: banner + producto + bullets con ícono — reutilizado por
// varias categorías cuyo layout de respaldo es igual al de "en uso"/
// "aclaración" (headline + producto + 2-3 razones), solo cambia el texto.
async function buildBulletsInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "64px 70px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", width: 940 }}>
            <Banner text={headline} accentColor={accentColor} />
          </div>
          {subtext && (
            <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 22, fontWeight: 500, color: MUTED, textAlign: "center" }}>{subtext}</div>
          )}

          <FloatingProduct src={imageDataUrl} size={340} />

          <div style={{ display: "flex", flexDirection: "column", width: 780, gap: 14 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <IconRow key={i} icon={<CheckIcon size={22} />} text={b} accentColor={accentColor} />
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 6. RENDIMIENTO — el número/dato de rendimiento como protagonista absoluto.
async function buildYieldInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: SIZE,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "56px 70px",
            gap: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 320,
              height: 320,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 24px 48px -20px ${accentColor}aa`,
            }}
          >
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: "white", textAlign: "center", padding: "0 20px" }}>
              {headline}
            </div>
          </div>
          {subtext && (
            <div style={{ display: "flex", width: 900, justifyContent: "center", fontSize: 26, fontWeight: 800, color: INK, textAlign: "center" }}>
              {subtext}
            </div>
          )}
          <FloatingProduct src={imageDataUrl} size={300} />
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: 940, gap: 16 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 999, padding: "14px 24px", boxShadow: "0 8px 20px -14px rgba(15,23,42,0.4)" }}
              >
                <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: INK }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 9. PRODUCTO LIMPIO — foto grande, casi sin texto.
async function buildCleanProductInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: SIZE,
            height: SIZE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <FloatingProduct src={imageDataUrl} size={680} />
          {headline && (
            <div style={{ display: "flex", width: 700, justifyContent: "center", textAlign: "center", fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -0.5 }}>
              {headline}
            </div>
          )}
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 10. COMPOSICIÓN — grilla numerada de ingredientes/componentes + producto.
async function buildCompositionInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, subtext, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 70px",
            gap: 26,
          }}
        >
          <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 38, fontWeight: 800, color: INK, textAlign: "center" }}>
            {headline}
          </div>
          {subtext && (
            <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 22, fontWeight: 500, color: MUTED, textAlign: "center" }}>{subtext}</div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 28, width: 940, marginTop: 8 }}>
            {bullets.slice(0, 4).map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 200, gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    width: 96,
                    height: 96,
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 10px 24px -10px ${accentColor}88`,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "white" }}>{i + 1}</div>
                </div>
                <div style={{ display: "flex", textAlign: "center", fontSize: 18, fontWeight: 800, color: INK }}>{b}</div>
              </div>
            ))}
          </div>
          <FloatingProduct src={imageDataUrl} size={300} />
        </div>
      </GradientFrame>
    ),
    { width: SIZE, height: SIZE, fonts: fonts(fontRegular, fontBold) },
  );
}

// 13. ETIQUETA — producto grande (para que la etiqueta real se lea bien) +
// datos reales del empaque alrededor, sin tapar el envase.
async function buildLabelInfographic(input: InfographicSetInput): Promise<Response> {
  const { accentColor, imageDataUrl, fontRegular, fontBold } = await loadInputs(input);
  const { headline, bullets } = input.claim;

  return new ImageResponse(
    (
      <GradientFrame accentColor={accentColor}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "56px 70px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", width: 940, justifyContent: "center", fontSize: 34, fontWeight: 800, color: INK, textAlign: "center" }}>
            {headline}
          </div>
          <FloatingProduct src={imageDataUrl} size={520} />
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: 940, gap: 16 }}>
            {bullets.slice(0, 3).map((b, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 16, padding: "14px 22px", boxShadow: "0 8px 20px -14px rgba(15,23,42,0.4)" }}
              >
                <div style={{ display: "flex", fontSize: 19, fontWeight: 800, color: INK }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </GradientFrame>
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
  rendimiento: buildYieldInfographic,
  instrucciones: buildBulletsInfographic,
  confianza: buildBulletsInfographic,
  producto_limpio: buildCleanProductInfographic,
  composicion: buildCompositionInfographic,
  publico_objetivo: buildBulletsInfographic,
  versatilidad: buildBulletsInfographic,
  etiqueta: buildLabelInfographic,
};

export async function buildInfographicSetImage(input: InfographicSetInput): Promise<Response> {
  const builder = BUILDERS[input.claim.category];
  if (!builder) throw new Error(`Categoría de infografía desconocida: ${input.claim.category}`);
  return builder(input);
}
