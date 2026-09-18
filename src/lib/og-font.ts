// Google Fonts devuelve el CSS partido en VARIOS bloques @font-face, cada
// uno cubriendo un unicode-range distinto (cyrillic, greek, vietnamese,
// latin-ext, latin...) — si agarrás la primera URL sin mirar el rango,
// terminás con una fuente que no tiene casi ningún glifo latino (bug real
// que encontramos: la mayoría de las letras se veían con un fallback
// genérico de Satori en vez de la fuente pedida). Hay que quedarse
// específicamente con el bloque "latin" (unicode-range que arranca en
// U+0000), que siempre cubre ASCII + acentos básicos.
// Además Google ya no sirve TTF ni con un User-Agent viejo — ahora manda
// WOFF, que Satori también acepta directamente.
const fontCache = new Map<string, ArrayBuffer>();

const OLD_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36";

export async function loadGoogleFontTtf(family: string, weight: number): Promise<ArrayBuffer> {
  const cacheKey = `${family}:${weight}`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, { headers: { "User-Agent": OLD_BROWSER_USER_AGENT } }).then((res) => res.text());

  const blocks = css.split("@font-face").slice(1);
  const latinBlock = blocks.find((b) => /unicode-range:\s*U\+0000-/.test(b)) ?? blocks[blocks.length - 1];
  const match = latinBlock?.match(/src: url\(([^)]+)\)/);
  if (!match) throw new Error(`No se pudo resolver la fuente de ${family} ${weight}`);

  const buffer = await fetch(match[1]).then((res) => res.arrayBuffer());
  fontCache.set(cacheKey, buffer);
  return buffer;
}
