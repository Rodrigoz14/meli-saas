// Satori (el motor detrás de ImageResponse de Next.js) solo acepta fuentes
// TTF/OTF — Google Fonts por defecto sirve WOFF2 a navegadores modernos, así
// que hay que pedirle la hoja de estilos con un User-Agent de un navegador
// viejo (no reconoce WOFF2) para que devuelva la URL del archivo TTF real.
// Se cachea en memoria del proceso para no volver a pedirla en cada imagen.
const fontCache = new Map<string, ArrayBuffer>();

const OLD_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36";

export async function loadGoogleFontTtf(family: string, weight: number): Promise<ArrayBuffer> {
  const cacheKey = `${family}:${weight}`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, { headers: { "User-Agent": OLD_BROWSER_USER_AGENT } }).then((res) => res.text());
  const match = css.match(/src: url\(([^)]+)\) format\('truetype'\)/) ?? css.match(/src: url\(([^)]+)\)/);
  if (!match) throw new Error(`No se pudo resolver la fuente TTF de ${family} ${weight}`);

  const buffer = await fetch(match[1]).then((res) => res.arrayBuffer());
  fontCache.set(cacheKey, buffer);
  return buffer;
}
