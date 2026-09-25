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

// Fondo blanco + el color de acento (elegido por el usuario o sugerido por
// IA a partir de la foto) — nunca negro. Mercado Libre rechaza infografías
// con fondo negro, pedido explícito del usuario tras recibir ese rechazo
// real, así que el degradado de fondo va directo de blanco al color real
// de marca, sin diluirlo a beige ni a pastel. COLOR_PANEL es un gris muy
// claro para tarjetas/bloques de texto que necesitan separarse del fondo
// sin recurrir a negro; COLOR_TEXTO es un gris cálido oscuro para texto
// legible sobre fondos claros (reemplaza al "blanco" que se usaba antes,
// pensado para un fondo oscuro que ya no existe).
function colorPalette(accentColor: string) {
  const name = hexToColorName(accentColor);
  return {
    COLOR_PRIMARIO: "blanco",
    COLOR_SECUNDARIO: name,
    COLOR_ACENTO: name,
    COLOR_PANEL: "gris perla muy claro",
    COLOR_TEXTO: "gris carbón cálido",
  };
}

// Reglas de diseño compartidas por las 5 piezas del set — sin esto, cada
// infografía sale con su propia tipografía/espaciado/estilo de ícono y el
// set completo se ve inconsistente. Se antepone al template de cada
// categoría en buildAiPrompt, no es un placeholder más.
const DESIGN_SYSTEM = `SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del envase, sin sombras duras ni negras.
- Render del envase: podés (y debés) darle más profundidad fotográfica al envase — renderizalo como un mockup 3D fotorrealista, con el volumen, los reflejos y las sombras propias de su material (plástico, aluminio, cartón, vidrio), como si fuera una foto de estudio profesional, en vez de un recorte plano pegado sobre el fondo. Esto es solo sobre CÓMO se ilumina y renderiza el envase — la forma, el texto, el logo y el diseño real de la etiqueta tienen que seguir siendo exactamente los mismos.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.`;

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

Genera una infografía cuadrada de 1200x1200 px, formato ficha de producto para Mercado Libre — debe verse como la campaña publicitaria de una marca premium, no como una plantilla genérica.

COMPOSICIÓN:
- El producto ({NOMBRE_PRODUCTO}) va centrado o ligeramente a la derecha, ocupando 55-65% de la altura del lienzo, apoyado sobre una superficie o pedestal sutil con sombra de contacto suave y reflejo tenue degradado hacia abajo.
- Fondo degradado radial amplio de {COLOR_PRIMARIO} a {COLOR_SECUNDARIO}, con un spotlight de luz detrás del producto para darle protagonismo. Suma 1-2 círculos grandes muy desenfocados en {COLOR_ACENTO} con baja opacidad, ubicados detrás/alrededor del producto (no detrás del texto), y una textura muy sutil de líneas diagonales finas o puntos, para que el fondo se vea con profundidad y no plano.
- El bloque de texto va a la izquierda, con espacio de aire generoso alrededor — no debe competir visualmente con el producto.

TIPOGRAFÍA Y TEXTO:
- Headline principal a la izquierda, 2 líneas, tipografía sans-serif condensada extra bold, todo mayúsculas: línea 1 en {COLOR_TEXTO} "{FRASE_GANCHO_LINEA_1}", línea 2 en {COLOR_ACENTO} notablemente más grande "{FRASE_GANCHO_LINEA_2}".
- Debajo, con espacio respecto al headline, 3-4 bullets en una sola columna: ícono circular lineal (contorno {COLOR_ACENTO}) + texto corto en {COLOR_TEXTO}: "{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}", "{BENEFICIO_4}".

ESTILO: sigue el SISTEMA DE DISEÑO al pie de la letra. Look premium tipo suplementos/farmacia, alto contraste, cero saturación visual. Sin marcas de agua, sin logos ajenos, sin errores ortográficos.

NO HACER: no tapar información nutricional ni el nombre de marca del envase con texto ni íconos. No usar fondo negro ni oscuro bajo ninguna circunstancia.`;

const TEMPLATE_BENEFICIOS = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla ni recrearla. Solo se compone sobre un fondo nuevo.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre enfocada 100% en comunicar beneficios de {NOMBRE_PRODUCTO}.

COMPOSICIÓN:
- Título gigante arriba, tipografía condensada extra bold mayúsculas, 2 líneas: "{TITULO_LINEA_1}" en {COLOR_TEXTO} + "{TITULO_LINEA_2}" en {COLOR_ACENTO}.
- Fila de 3 íconos grandes, mismo estilo lineal, en círculos con borde {COLOR_ACENTO}, cada uno representando un beneficio.
- El producto flota en la parte central-inferior, halo de luz {COLOR_ACENTO} detrás, tamaño mediano (40-50% del alto), con espacio de aire a los lados.
- Fondo de dos tonos ({COLOR_PRIMARIO} a {COLOR_SECUNDARIO}), separación diagonal o curva suave, con una banda diagonal ancha y desenfocada en {COLOR_ACENTO} de baja opacidad cruzando el fondo, y un patrón sutil de puntos pequeños en la mitad de color para dar textura.

BLOQUE INFERIOR: 3 tarjetas en {COLOR_PANEL} con esquinas redondeadas y sombra sutil, una por columna, cada una con encabezado corto en {COLOR_ACENTO} ("{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}") y una frase explicativa corta debajo en {COLOR_TEXTO}: "{EXPLICACION_1}", "{EXPLICACION_2}", "{EXPLICACION_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Alto contraste, texto perfectamente legible en miniatura, look profesional de e-commerce premium.

NO HACER: no ocultar el nombre del producto en la etiqueta, no usar más de 3 beneficios principales, no usar fondo negro ni oscuro.`;

const TEMPLATE_COMPARACION = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla. Solo se compone sobre el fondo nuevo, en el lado izquierdo.

Genera una infografía cuadrada de 1200x1200 px de comparación directa para Mercado Libre entre {NOMBRE_PRODUCTO} y un producto genérico/sin marca.

COMPOSICIÓN SUPERIOR: fondo dividido en dos mitades, ambas en blanco (sin negro), cada mitad con un leve tinte de textura de puntos finos casi imperceptible para no verse plano. Izquierda bien iluminada con el producto real (imagen subida) sobre un pedestal con luz. Derecha con un envase genérico GENERADO, liso, sin marca, gris apagado mate, con texto "OTRAS MARCAS" en {COLOR_TEXTO}. "VS" grande en el centro, con un círculo desenfocado en {COLOR_ACENTO} de baja opacidad detrás y una línea diagonal de luz {COLOR_ACENTO} marcando la división. Badge {COLOR_ACENTO} con check sobre el producto real; badge gris con X sobre el genérico.

TABLA COMPARATIVA (mitad inferior): tarjeta {COLOR_PANEL} con esquinas redondeadas, 3 columnas — atributo en {COLOR_TEXTO} | check verde (marca) | X roja (genérico). 4-5 filas: "{ATRIBUTO_1}", "{ATRIBUTO_2}", "{ATRIBUTO_3}", "{ATRIBUTO_4}", "{ATRIBUTO_5}".

ESTILO: sigue el SISTEMA DE DISEÑO. Tipografía condensada extra bold, contraste alto, checks verdes y X rojas bien visibles en miniatura.

NO HACER: no mostrar logos ni marcas reales de competencia, no inventar certificaciones, no usar fondo negro ni oscuro.`;

const TEMPLATE_EN_USO = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificar su forma ni etiqueta. Se integra con sombra e iluminación de la escena.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre que muestre {NOMBRE_PRODUCTO} en uso / modo de preparación.

COMPOSICIÓN:
- Título superior extra bold en 2 líneas: línea 1 en {COLOR_TEXTO} "{TITULO_USO_LINEA_1}", línea 2 en {COLOR_ACENTO} más grande "{TITULO_USO_LINEA_2}".
- Fondo claro dividido en dos escenas lado a lado (split-screen) representando dos formas/momentos de uso, separadas por una diagonal sutil — ambas escenas bien iluminadas, sin negro. Cada escena con un degradado suave hacia {COLOR_ACENTO} en las esquinas y una o dos formas orgánicas (blobs) muy desenfocadas en {COLOR_ACENTO} de baja opacidad, para dar ambiente sin distraer del producto.
- El producto (imagen subida) va al centro-derecha, tamaño protagonista (45-55% del alto), con sombra realista.
- Debajo de cada escena, una tarjeta en {COLOR_PANEL} con esquinas redondeadas: ícono + texto "{USO_1_TITULO}" / "{USO_1_DETALLE}" y "{USO_2_TITULO}" / "{USO_2_DETALLE}", texto en {COLOR_TEXTO}.

BARRA INFERIOR: 3 claims cortos con ícono, mismo estilo lineal, texto en {COLOR_TEXTO}: "{CLAIM_USO_1}", "{CLAIM_USO_2}", "{CLAIM_USO_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Fotografía realista y profesional, iluminación coherente entre envase y fondo, alta legibilidad en miniatura.

NO HACER: no generar rostros de personas reconocibles ni logos ajenos. No usar fondo negro ni oscuro.`;

const TEMPLATE_ACLARACION = `Usa la imagen adjunta del producto EXACTAMENTE como está, sin modificarla, solo se compone sobre el fondo generado.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre tipo "aclaración" de {NOMBRE_PRODUCTO}, con foco en un solo mensaje contundente.

COMPOSICIÓN:
- Título en 2 líneas gigante, condensado extra bold mayúsculas: línea 1 en {COLOR_TEXTO} "{ACLARACION_LINEA_1}", línea 2 en {COLOR_ACENTO} mucho más grande "{ACLARACION_LINEA_2}".
- Tarjeta en {COLOR_PANEL} con esquinas redondeadas: ícono grande + dato destacado en {COLOR_ACENTO}, descripción corta debajo en {COLOR_TEXTO}: "{DATO_DESTACADO}" / "{DATO_DESCRIPCION}".
- 2-3 bullets con ícono circular lineal de contorno {COLOR_ACENTO}, texto en {COLOR_TEXTO}: "{DETALLE_1}", "{DETALLE_2}", "{DETALLE_3}".
- El producto (imagen subida) al lado derecho, tamaño medio-grande (45-55% del alto), sombra suave, halo {COLOR_ACENTO} detrás.
- Fondo en {COLOR_PRIMARIO} con una forma geométrica grande (círculo o banda diagonal) en {COLOR_ACENTO} de baja opacidad detrás del título, y una textura sutil de grano o líneas finas en el resto del lienzo.

BARRA INFERIOR (opcional): 2-3 claims con ícono, mismo estilo lineal, texto en {COLOR_TEXTO}: "{CLAIM_FINAL_1}", "{CLAIM_FINAL_2}", "{CLAIM_FINAL_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Máximo contraste tipográfico, tono directo y confiable.

NO HACER: no incluir afirmaciones médicas/regulatorias que no estén en la etiqueta real, no exagerar cifras, no usar fondo negro ni oscuro.`;

const TEMPLATES: Record<InfographicSetCategory, string> = {
  producto: TEMPLATE_PRODUCTO,
  beneficios: TEMPLATE_BENEFICIOS,
  comparacion: TEMPLATE_COMPARACION,
  en_uso: TEMPLATE_EN_USO,
  aclaracion: TEMPLATE_ACLARACION,
};

// Higgsfield rechaza cualquier prompt de más de 5000 caracteres (400). Con
// nombre de producto y textos en su longitud máxima permitida, el prompt
// final puede superar ese límite (confirmado probando el peor caso real) —
// el recorte cae en el NO HACER final, no en las instrucciones críticas de
// preservar el producto/composición, que van al principio.
const MAX_PROMPT_LENGTH = 4900;

export function buildAiPrompt(claim: InfographicClaim, productName: string, accentColor: string): string {
  const vars = buildVarsProxy(claim, productName, accentColor);
  const prompt = fillTemplate(`${DESIGN_SYSTEM}\n\n${TEMPLATES[claim.category]}`, vars);
  return prompt.length > MAX_PROMPT_LENGTH ? prompt.slice(0, MAX_PROMPT_LENGTH) : prompt;
}

// Usado tanto para pasarle bytes reales a un proveedor de IA (Higgsfield)
// como, antes, para Cloudflare — se mantiene exportado porque cualquier
// proveedor que trabaje con la imagen en crudo (en vez de una URL pública)
// necesita decodificar el data URL o bajar la URL real primero.
export async function dataUrlToBuffer(dataUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { buffer: Buffer.from(match[2], "base64"), mimeType: match[1] };
  const res = await fetch(dataUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType: res.headers.get("content-type") || "image/jpeg" };
}
