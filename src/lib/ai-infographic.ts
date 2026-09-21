import type { InfographicClaim, InfographicSetCategory } from "@/lib/ai";

// Placeholder temporal mientras se evalúa una IA de edición de imagen de
// paga (Gemini u otra) — con el modelo gratuito de Cloudflare confirmamos
// que NO preserva el producto real de forma confiable (llega a inventar
// texto/forma distinta). El usuario pidió avanzar así a propósito, a
// sabiendas de esa limitación, así que estas imágenes son un placeholder
// visual, no una representación exacta del producto.
// Convierte CUALQUIER hex (preset, elegido en el círculo cromático, o
// sugerido por IA a partir de la foto) a un nombre de color en español —
// el prompt de texto necesita una palabra, no un código hex.
function hexToColorName(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (Number.isNaN(max)) return "azul";
  if (max - min < 0.08) {
    if (lightness > 0.85) return "blanco";
    if (lightness < 0.15) return "negro";
    return "gris";
  }

  let hue = 0;
  const delta = max - min;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = ((hue * 60) + 360) % 360;

  const saturationWord = lightness > 0.75 ? "pastel" : lightness < 0.3 ? "oscuro" : "intenso";

  if (hue < 15 || hue >= 345) return `rojo ${saturationWord}`;
  if (hue < 45) return `naranja ${saturationWord}`;
  if (hue < 70) return `amarillo ${saturationWord}`;
  if (hue < 90) return `verde lima ${saturationWord}`;
  if (hue < 150) return `verde ${saturationWord}`;
  if (hue < 195) return `turquesa ${saturationWord}`;
  if (hue < 230) return `celeste ${saturationWord}`;
  if (hue < 255) return `azul ${saturationWord}`;
  if (hue < 275) return `indigo ${saturationWord}`;
  if (hue < 300) return `violeta ${saturationWord}`;
  if (hue < 330) return `rosa ${saturationWord}`;
  return `rojo ${saturationWord}`;
}

function colorPalette(accentColor: string) {
  const name = hexToColorName(accentColor);
  return {
    COLOR_PRIMARIO: `negro con tono ${name} oscuro`,
    COLOR_SECUNDARIO: "negro",
    COLOR_ACENTO: name,
  };
}

// Cualquier placeholder que no sea nombre/color se llena rotando por el
// contenido real disponible (headline, subtext, bullets) — los 5 templates
// tienen decenas de placeholders distintos (BENEFICIO_1, ATRIBUTO_3,
// DETALLE_2...) y todos apuntan al mismo puñado de textos reales.
function buildVarsProxy(claim: InfographicClaim, productName: string, accentColor: string): Record<string, string> {
  const fixed = { NOMBRE_PRODUCTO: productName, NOMBRE_MARCA: productName, ...colorPalette(accentColor) };
  const pool = [claim.headline, claim.subtext, ...claim.bullets].filter((s) => s && s.trim().length > 0);
  let i = 0;
  const next = () => (pool.length > 0 ? pool[i++ % pool.length] : productName);

  return new Proxy(fixed as Record<string, string>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return next();
    },
  });
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

const TEMPLATE_PRODUCTO = `Usa la imagen adjunta del producto EXACTAMENTE como está: no cambies su forma, etiqueta, texto, colores, proporciones, ángulo, reflejos ni sombras propias del envase. No la reinterpretes ni la regeneres. Trátala como un recorte fijo que debes insertar sobre un fondo nuevo.

Genera una infografía cuadrada de 1200x1200 px, formato ficha de producto para Mercado Libre, estilo publicitario premium de suplementos deportivos.

COMPOSICIÓN:
- El producto ({NOMBRE_PRODUCTO}) va centrado o ligeramente a la derecha, ocupando 55-65% de la altura del lienzo, apoyado sobre una superficie o pedestal sutil con sombra de contacto suave y reflejo tenue degradado hacia abajo.
- Fondo degradado en el color de marca {COLOR_PRIMARIO} a {COLOR_SECUNDARIO}, con luz tipo spotlight detrás del producto para darle protagonismo.

TIPOGRAFÍA Y TEXTO:
- Headline principal a la izquierda, 2 líneas, tipografía sans-serif condensada, bold, todo mayúsculas: línea 1 en blanco "{FRASE_GANCHO_LINEA_1}", línea 2 en {COLOR_ACENTO} más grande "{FRASE_GANCHO_LINEA_2}".
- Debajo, 3-4 bullets con ícono circular (contorno {COLOR_ACENTO}) + texto corto: "{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}", "{BENEFICIO_4}".

ESTILO: iluminación de estudio profesional tipo producto premium, alto contraste, look gym/fitness tech, todo el texto perfectamente legible en miniatura. Sin marcas de agua, sin logos ajenos, sin errores ortográficos.

NO HACER: no tapar información nutricional ni el nombre de marca del envase con texto ni íconos.`;

const TEMPLATE_BENEFICIOS = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla ni recrearla. Solo se compone sobre un fondo nuevo.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre enfocada 100% en comunicar beneficios de {NOMBRE_PRODUCTO}.

COMPOSICIÓN:
- Título gigante arriba, tipografía condensada bold mayúsculas, 2 líneas: "{TITULO_LINEA_1}" en blanco + "{TITULO_LINEA_2}" en {COLOR_ACENTO}.
- Fila de 3 íconos grandes en círculos con borde {COLOR_ACENTO} representando beneficios.
- El producto flota en la parte central-inferior, halo de luz {COLOR_ACENTO} detrás, tamaño mediano (40-50% del alto).
- Fondo de dos tonos ({COLOR_PRIMARIO} a {COLOR_SECUNDARIO}), separación diagonal o curva suave.

BLOQUE INFERIOR: recuadro de 3 columnas, cada una con encabezado corto en {COLOR_ACENTO} ("{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}") y una frase explicativa corta debajo en blanco: "{EXPLICACION_1}", "{EXPLICACION_2}", "{EXPLICACION_3}".

ESTILO: alto contraste, texto perfectamente legible en miniatura, look profesional de e-commerce de suplementos.

NO HACER: no ocultar el nombre del producto en la etiqueta, no usar más de 3 beneficios principales.`;

const TEMPLATE_COMPARACION = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla. Solo se compone sobre el fondo nuevo, en el lado izquierdo.

Genera una infografía cuadrada de 1200x1200 px de comparación directa para Mercado Libre entre {NOMBRE_PRODUCTO} y un producto genérico/sin marca.

COMPOSICIÓN SUPERIOR: fondo dividido en dos mitades. Izquierda bien iluminada con el producto real (imagen subida) sobre un pedestal con luz. Derecha más oscura con un envase genérico GENERADO, liso, sin marca, gris/negro mate, con texto "OTRAS MARCAS". "VS" grande en el centro con línea diagonal de luz {COLOR_ACENTO}. Badge {COLOR_ACENTO} con check sobre el producto real; badge gris con X sobre el genérico.

TABLA COMPARATIVA (mitad inferior): 3 columnas — atributo | check verde (marca) | X roja (genérico). 4-5 filas: "{ATRIBUTO_1}", "{ATRIBUTO_2}", "{ATRIBUTO_3}", "{ATRIBUTO_4}", "{ATRIBUTO_5}".

ESTILO: tipografía condensada bold, contraste alto, checks verdes y X rojas bien visibles en miniatura, fondo {COLOR_PRIMARIO}/{COLOR_SECUNDARIO}.

NO HACER: no mostrar logos ni marcas reales de competencia, no inventar certificaciones.`;

const TEMPLATE_EN_USO = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificar su forma ni etiqueta. Se integra con sombra e iluminación de la escena.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre que muestre {NOMBRE_PRODUCTO} en uso / modo de preparación.

COMPOSICIÓN:
- Título superior bold en 2 líneas: línea 1 en blanco "{TITULO_USO_LINEA_1}", línea 2 en {COLOR_ACENTO} más grande "{TITULO_USO_LINEA_2}".
- Fondo dividido en dos escenas lado a lado (split-screen) representando dos formas/momentos de uso, separadas por una diagonal.
- El producto (imagen subida) va al centro-derecha, tamaño protagonista (45-55% del alto), con sombra realista.
- Debajo de cada escena, tarjeta con ícono + texto: "{USO_1_TITULO}" / "{USO_1_DETALLE}" y "{USO_2_TITULO}" / "{USO_2_DETALLE}".

BARRA INFERIOR: 3 claims cortos con ícono: "{CLAIM_USO_1}", "{CLAIM_USO_2}", "{CLAIM_USO_3}".

ESTILO: fotografía realista y profesional, iluminación coherente entre envase y fondo, colores {COLOR_PRIMARIO}/{COLOR_ACENTO}, alta legibilidad en miniatura.

NO HACER: no generar rostros de personas reconocibles ni logos ajenos.`;

const TEMPLATE_ACLARACION = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla, solo se compone sobre el fondo generado.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre tipo "aclaración" de {NOMBRE_PRODUCTO}, con foco en un solo mensaje contundente.

COMPOSICIÓN:
- Título en 2 líneas gigante, condensado bold mayúsculas: línea 1 en blanco "{ACLARACION_LINEA_1}", línea 2 en {COLOR_ACENTO} mucho más grande "{ACLARACION_LINEA_2}".
- Bloque con ícono grande + dato destacado en {COLOR_ACENTO}, descripción corta debajo en blanco: "{DATO_DESTACADO}" / "{DATO_DESCRIPCION}".
- 2-3 bullets con ícono circular de contorno {COLOR_ACENTO}: "{DETALLE_1}", "{DETALLE_2}", "{DETALLE_3}".
- El producto (imagen subida) al lado derecho, tamaño medio-grande (45-55% del alto), sombra suave, halo {COLOR_ACENTO} detrás.

BARRA INFERIOR (opcional): 2-3 claims con ícono: "{CLAIM_FINAL_1}", "{CLAIM_FINAL_2}", "{CLAIM_FINAL_3}".

ESTILO: máximo contraste tipográfico, fondo {COLOR_PRIMARIO}/{COLOR_SECUNDARIO}/{COLOR_ACENTO}, tono directo y confiable.

NO HACER: no incluir afirmaciones médicas/regulatorias que no estén en la etiqueta real, no exagerar cifras.`;

const TEMPLATES: Record<InfographicSetCategory, string> = {
  producto: TEMPLATE_PRODUCTO,
  beneficios: TEMPLATE_BENEFICIOS,
  comparacion: TEMPLATE_COMPARACION,
  en_uso: TEMPLATE_EN_USO,
  aclaracion: TEMPLATE_ACLARACION,
};

export function buildAiPrompt(claim: InfographicClaim, productName: string, accentColor: string): string {
  const vars = buildVarsProxy(claim, productName, accentColor);
  return fillTemplate(TEMPLATES[claim.category], vars);
}

async function dataUrlToBuffer(dataUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
  const res = await fetch(dataUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType: res.headers.get("content-type") || "image/jpeg" };
}

// El filtro de seguridad de Cloudflare rechaza al azar ~1 de cada 3
// pedidos idénticos (confirmado probando el mismo prompt/imagen varias
// veces) — reintenta un par de veces antes de rendirse.
export async function generateAiInfographic(imageDataUrl: string, prompt: string): Promise<Uint8Array> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Workers AI no está configurado");
  }

  const { buffer, mimeType } = await dataUrlToBuffer(imageDataUrl);
  const imageBytes = new Uint8Array(buffer);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("image", new Blob([imageBytes], { type: mimeType }), "product.jpg");

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-9b`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
    );

    if (res.ok) {
      const data = await res.json();
      const image = data?.result?.image;
      if (image) return new Uint8Array(Buffer.from(image, "base64"));
      lastError = new Error("Cloudflare no devolvió una imagen");
      continue;
    }
    lastError = new Error(`Cloudflare Workers AI ${res.status}: ${await res.text()}`);
  }
  throw lastError ?? new Error("No se pudo generar la infografía con IA");
}
