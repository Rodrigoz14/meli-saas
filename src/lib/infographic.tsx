import type { CSSProperties } from "react";
import { ImageResponse } from "next/og";
import { generateCallouts } from "@/lib/ai";
import { loadGoogleFontTtf } from "@/lib/og-font";

const SIZE = 1080;

function Badge({ text, color, style }: { text: string; color: string; style: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "white",
        borderRadius: 999,
        padding: "16px 24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        border: `2px solid ${color}`,
        maxWidth: 320,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 999,
          background: color,
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", lineHeight: 1.15 }}>{text}</div>
    </div>
  );
}

export type InfographicInput = {
  // Uno de los dos: imageDataUrl (foto subida a mano, ya en base64) o
  // imageUrl (la miniatura REAL de una publicación propia — se resuelve
  // acá mismo, del lado del servidor, para no depender de que el
  // navegador pueda leer una imagen de otro origen).
  imageDataUrl?: string;
  imageUrl?: string;
  productName?: string;
  keyFeatures?: string;
  accentColor?: string;
};

async function resolveImageDataUrl(input: InfographicInput): Promise<string> {
  if (input.imageDataUrl) return input.imageDataUrl;
  if (!input.imageUrl) throw new Error("Falta la foto del producto");

  const res = await fetch(input.imageUrl);
  if (!res.ok) throw new Error("No se pudo traer la foto de la publicación");
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

// Compone la infografía real (foto + llamados generados con IA) en un PNG
// usando ImageResponse (Satori) de Next.js — nada de esto pasa por un
// modelo de generación de imágenes (no tenemos uno configurado); es una
// plantilla real renderizada con los datos reales que pasa el usuario.
export async function buildInfographicImageResponse(input: InfographicInput): Promise<Response> {
  const { productName = "", keyFeatures = "" } = input;
  const accentColor = input.accentColor || "#5670f0";

  const [imageDataUrl, callouts, fontRegular, fontBold] = await Promise.all([
    resolveImageDataUrl(input),
    generateCallouts(productName, keyFeatures),
    loadGoogleFontTtf("Inter", 400),
    loadGoogleFontTtf("Inter", 700),
  ]);

  const positions: CSSProperties[] = [
    { top: 70, left: 50 },
    { top: 70, right: 50, alignSelf: "flex-end" },
    { bottom: 90, left: 50 },
    { bottom: 90, right: 50 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: SIZE / 2 - 320,
            left: SIZE / 2 - 320,
            width: 640,
            height: 640,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            borderRadius: 32,
            boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt=""
            width={600}
            height={600}
            style={{ objectFit: "contain", borderRadius: 20 }}
          />
        </div>

        {callouts.slice(0, 4).map((text, i) => (
          <Badge key={i} text={text} color={accentColor} style={positions[i]} />
        ))}

        {productName && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 60,
              right: 60,
              display: "flex",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
              color: "#374151",
              textAlign: "center",
            }}
          >
            {productName.slice(0, 70)}
          </div>
        )}
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400 },
        { name: "Inter", data: fontBold, weight: 700 },
      ],
    },
  );
}
