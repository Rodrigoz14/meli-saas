import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El límite default (1MB) se queda corto para las fotos de producto que
  // se mandan como data URL a los server actions (sugerir color, SEO,
  // descripción) — 8MB matches el tope que ya se valida en el cliente al
  // subir la foto.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
