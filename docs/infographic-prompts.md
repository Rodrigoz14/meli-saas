# Prompts del generador de infografías (Higgsfield)

Este documento refleja **exactamente** lo que hay en `src/lib/ai-infographic.ts`
(función `buildAiPrompt`). Cada uno de los 6 prompts de abajo es el texto
**completo y final** que se manda a Higgsfield: Sistema de Diseño + template
de la categoría, concatenados (así es como lo hace el código en runtime). Si
se edita el código, hay que actualizar este doc a mano — no se genera
automáticamente.

## Contexto y referencias (por qué existe cada regla)

| Regla | Origen |
|---|---|
| Preservar el producto real | Con el proveedor anterior (Cloudflare/Flux) la IA alucinaba el producto — inventaba forma, texto o marca distintos. Con Higgsfield esto ya no pasa, pero la instrucción se mantiene explícita en los 6 prompts. |
| Fondo blanco + color de acento, nunca negro | Mercado Libre **rechazó infografías reales con fondo negro** (caso real reportado por el usuario). El fondo va siempre de blanco al color de marca elegido/sugerido, nunca a negro ni a un tono muy oscuro. |
| Fondos "trabajados" (degradados + formas + textura) | Pedido explícito: "mejorá los fondos, usando figuras con el color de contraste o degradados, texturas, etc." — un fondo plano no cumple esto. |
| Libertad creativa sobre el producto (perspectiva, ángulo, posición, render) | Pedido explícito: para todo tipo de producto, las piezas pueden variar perspectiva, ángulo, posición y tipo de render para que se vean más dinámicas. **Excepción:** la portada no se modifica (usa la foto real tal cual). En todas las piezas la identidad del producto (logo, etiqueta, textos, colores) queda fija — nunca se reescribe ni inventa. |
| Prompts válidos para cualquier categoría | Pedido explícito: ningún prompt debe asumir un rubro (suplementos, farmacia, alimentos). Se reemplazaron ejemplos y términos específicos ("modo de preparación", "información nutricional", "envase genérico", "NO TIENE AZÚCAR", "NO DA ACNÉ") por versiones neutrales según categoría. |
| Tipografía/espaciado/íconos consistentes entre las piezas del set | Pedido de mejorar "en un 100%" la calidad y el diseño — un set de infografías con tipografías e íconos distintos entre sí se ve poco profesional. |
| Solo 5 categorías originales (producto, beneficios, comparación, en uso, aclaración) | Las imágenes de fichas de producto que se compartieron como referencia eran para guiar el **estilo/diseño**, no para agregar categorías nuevas — se probaron 13 categorías y se revirtió a las 5 originales por pedido explícito. |
| Categoría "Portada" (nueva, va primera) | Pedido explícito posterior: una imagen de portada minimalista — solo el producto centrado sobre un fondo, sin bullets ni texto de venta — para usar como primera imagen del set. |

### Variables de color (se resuelven antes de mandar el prompt)

| Variable | Valor |
|---|---|
| `{COLOR_PRIMARIO}` | Siempre `"blanco"` |
| `{COLOR_SECUNDARIO}` | El color de acento real (elegido por el usuario o sugerido por IA a partir de la foto), convertido a nombre en español |
| `{COLOR_ACENTO}` | Igual a `{COLOR_SECUNDARIO}` |
| `{COLOR_PANEL}` | Siempre `"gris perla muy claro"` (fondo de tarjetas) |
| `{COLOR_TEXTO}` | Siempre `"gris carbón cálido"` (texto sobre fondo claro) |

Los demás placeholders (`{FRASE_GANCHO_LINEA_1}`, `{BENEFICIO_1}`, `{ATRIBUTO_3}`, etc.) se
rellenan con el headline/subtítulo/bullets reales que el vendedor escribió o que Claude
sugirió. Hay además un tope de seguridad: si el prompt final supera los **4900
caracteres**, se recorta a esa longitud — Higgsfield rechaza cualquier prompt de más de
5000 caracteres.

---

## 1. Portada

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto, insertado sobre un fondo nuevo. PRODUCTO SIN CAMBIOS: no modifiques su perspectiva, ángulo, posición ni tipo de render — usá la foto real tal cual, solo recortala y ubicala sobre el fondo.

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre tipo "portada"/foto de catálogo — minimalista, casi sin texto, el protagonista absoluto es el producto centrado.

COMPOSICIÓN:
- El producto ({NOMBRE_PRODUCTO}) centrado, ocupando 65-75% de la altura del lienzo, apoyado sobre un pedestal o superficie con reflejo sutil degradado hacia abajo y sombra de contacto realista.
- Fondo limpio en {COLOR_PRIMARIO} con un degradado radial suave hacia {COLOR_ACENTO} y una sola forma geométrica grande y muy desenfocada detrás del producto — sin más elementos, siguiendo el sistema de diseño pero de forma mucho más sobria que el resto del set.
- Si hay headline (opcional), va chico y discreto en una esquina inferior, en {COLOR_TEXTO}: "{FRASE_GANCHO_LINEA_1}".

ESTILO: sigue el SISTEMA DE DISEÑO. Máxima limpieza visual, como una foto de catálogo premium.

NO HACER: no agregar bullets, tarjetas ni íconos — esta pieza no lleva bloques de venta, solo el producto y el fondo. No usar fondo negro ni oscuro.
```

## 2. Producto

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto, insertado sobre un fondo nuevo. LIBERTAD CREATIVA SOBRE EL PRODUCTO: podés cambiar su perspectiva, ángulo, posición o tipo de render (3/4, frontal, cenital, flotando, con reflejos) para que la pieza se vea más dinámica — manteniendo intacta su identidad (etiqueta, logo, textos y colores).

Genera una infografía cuadrada de 1200x1200 px, formato ficha de producto para Mercado Libre — debe verse como la campaña publicitaria de una marca premium, no como una plantilla genérica.

COMPOSICIÓN:
- El producto ({NOMBRE_PRODUCTO}) va centrado o ligeramente a la derecha, ocupando 55-65% de la altura del lienzo, apoyado sobre una superficie o pedestal sutil con sombra de contacto suave y reflejo tenue degradado hacia abajo.
- Fondo degradado radial amplio de {COLOR_PRIMARIO} a {COLOR_SECUNDARIO}, con un spotlight de luz detrás del producto para darle protagonismo. Suma 1-2 círculos grandes muy desenfocados en {COLOR_ACENTO} con baja opacidad, ubicados detrás/alrededor del producto (no detrás del texto), y una textura muy sutil de líneas diagonales finas o puntos, para que el fondo se vea con profundidad y no plano.
- El bloque de texto va a la izquierda, con espacio de aire generoso alrededor — no debe competir visualmente con el producto.

TIPOGRAFÍA Y TEXTO:
- Headline principal a la izquierda, 2 líneas, tipografía sans-serif condensada extra bold, todo mayúsculas: línea 1 en {COLOR_TEXTO} "{FRASE_GANCHO_LINEA_1}", línea 2 en {COLOR_ACENTO} notablemente más grande "{FRASE_GANCHO_LINEA_2}".
- Debajo, con espacio respecto al headline, 3-4 bullets en una sola columna: ícono circular lineal (contorno {COLOR_ACENTO}) + texto corto en {COLOR_TEXTO}: "{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}", "{BENEFICIO_4}".

ESTILO: sigue el SISTEMA DE DISEÑO al pie de la letra. Look premium de campaña publicitaria de marca, coherente con la categoría real del producto (sea suplemento, electrónica, ropa, hogar, belleza, etc.), alto contraste, cero saturación visual. Sin marcas de agua, sin logos ajenos, sin errores ortográficos.

NO HACER: no tapar ninguna información impresa en el empaque o etiqueta real (ingredientes, especificaciones, certificaciones, instrucciones, etc.) ni el nombre de marca del producto con texto ni íconos. No usar fondo negro ni oscuro bajo ninguna circunstancia.
```

## 3. Beneficios

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto, solo se compone sobre un fondo nuevo. LIBERTAD CREATIVA SOBRE EL PRODUCTO: podés cambiar su perspectiva, ángulo, posición o tipo de render para que la pieza se vea más dinámica — manteniendo intacta su identidad (etiqueta, logo, textos y colores).

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre enfocada 100% en comunicar beneficios de {NOMBRE_PRODUCTO}.

COMPOSICIÓN:
- Título gigante arriba, tipografía condensada extra bold mayúsculas, 2 líneas: "{TITULO_LINEA_1}" en {COLOR_TEXTO} + "{TITULO_LINEA_2}" en {COLOR_ACENTO}.
- Fila de 3 íconos grandes, mismo estilo lineal, en círculos con borde {COLOR_ACENTO}, cada uno representando un beneficio.
- El producto flota en la parte central-inferior, halo de luz {COLOR_ACENTO} detrás, tamaño mediano (40-50% del alto), con espacio de aire a los lados.
- Fondo de dos tonos ({COLOR_PRIMARIO} a {COLOR_SECUNDARIO}), separación diagonal o curva suave, con una banda diagonal ancha y desenfocada en {COLOR_ACENTO} de baja opacidad cruzando el fondo, y un patrón sutil de puntos pequeños en la mitad de color para dar textura.

BLOQUE INFERIOR: 3 tarjetas en {COLOR_PANEL} con esquinas redondeadas y sombra sutil, una por columna, cada una con encabezado corto en {COLOR_ACENTO} ("{BENEFICIO_1}", "{BENEFICIO_2}", "{BENEFICIO_3}") y una frase explicativa corta debajo en {COLOR_TEXTO}: "{EXPLICACION_1}", "{EXPLICACION_2}", "{EXPLICACION_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Alto contraste, texto perfectamente legible en miniatura, look profesional de e-commerce premium.

NO HACER: no ocultar el nombre del producto en la etiqueta, no usar más de 3 beneficios principales, no usar fondo negro ni oscuro.
```

## 4. Comparación

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto, en el lado izquierdo. LIBERTAD CREATIVA SOBRE EL PRODUCTO: podés cambiar su perspectiva, ángulo o tipo de render para que la comparación se vea más dinámica — manteniendo intacta su identidad (etiqueta, logo, textos y colores).

Genera una infografía cuadrada de 1200x1200 px de comparación directa para Mercado Libre entre {NOMBRE_PRODUCTO} y un producto genérico/sin marca.

COMPOSICIÓN SUPERIOR: fondo dividido en dos mitades, ambas en blanco (sin negro), cada mitad con un leve tinte de textura de puntos finos casi imperceptible para no verse plano. Izquierda bien iluminada con el producto real (imagen subida) sobre un pedestal con luz. Derecha con una versión genérica GENERADA del MISMO tipo de producto (misma forma/categoría, nunca otro objeto), lisa, sin marca, gris apagado mate, con texto "OTRAS MARCAS" en {COLOR_TEXTO}. "VS" grande en el centro, con un círculo desenfocado en {COLOR_ACENTO} de baja opacidad detrás y una línea diagonal de luz {COLOR_ACENTO} marcando la división. Badge {COLOR_ACENTO} con check sobre el producto real; badge gris con X sobre el genérico.

TABLA COMPARATIVA (mitad inferior): tarjeta {COLOR_PANEL} con esquinas redondeadas, 3 columnas — atributo en {COLOR_TEXTO} | check verde (marca) | X roja (genérico). 4-5 filas: "{ATRIBUTO_1}", "{ATRIBUTO_2}", "{ATRIBUTO_3}", "{ATRIBUTO_4}", "{ATRIBUTO_5}".

ESTILO: sigue el SISTEMA DE DISEÑO. Tipografía condensada extra bold, contraste alto, checks verdes y X rojas bien visibles en miniatura.

NO HACER: no mostrar logos ni marcas reales de competencia, no inventar certificaciones, no usar fondo negro ni oscuro.
```

## 5. Producto en uso

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto, integrado con sombra e iluminación de la escena. LIBERTAD CREATIVA SOBRE EL PRODUCTO: podés cambiar su perspectiva, ángulo, posición o tipo de render para que se vea natural dentro de cada escena de uso — manteniendo intacta su identidad (etiqueta, logo, textos y colores).

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre que muestre {NOMBRE_PRODUCTO} en uso real, en la vida cotidiana (cómo se usa, se aplica, se lleva o se aprovecha según su categoría).

COMPOSICIÓN:
- Título superior extra bold en 2 líneas: línea 1 en {COLOR_TEXTO} "{TITULO_USO_LINEA_1}", línea 2 en {COLOR_ACENTO} más grande "{TITULO_USO_LINEA_2}".
- Fondo claro dividido en dos escenas lado a lado (split-screen) representando dos formas/momentos de uso, separadas por una diagonal sutil — ambas escenas bien iluminadas, sin negro. Cada escena con un degradado suave hacia {COLOR_ACENTO} en las esquinas y una o dos formas orgánicas (blobs) muy desenfocadas en {COLOR_ACENTO} de baja opacidad, para dar ambiente sin distraer del producto.
- El producto (imagen subida) va al centro-derecha, tamaño protagonista (45-55% del alto), con sombra realista.
- Debajo de cada escena, una tarjeta en {COLOR_PANEL} con esquinas redondeadas: ícono + texto "{USO_1_TITULO}" / "{USO_1_DETALLE}" y "{USO_2_TITULO}" / "{USO_2_DETALLE}", texto en {COLOR_TEXTO}.

BARRA INFERIOR: 3 claims cortos con ícono, mismo estilo lineal, texto en {COLOR_TEXTO}: "{CLAIM_USO_1}", "{CLAIM_USO_2}", "{CLAIM_USO_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Fotografía realista y profesional, iluminación coherente entre el producto y el fondo, alta legibilidad en miniatura.

NO HACER: no generar rostros de personas reconocibles ni logos ajenos. No usar fondo negro ni oscuro.
```

## 6. Aclaración

```
SISTEMA DE DISEÑO (aplica a toda la pieza, es la base de calidad — no te lo puedes saltar):
- Tipografía: una sola familia sans-serif geométrica condensada (tipo Poppins ExtraBold / Montserrat Black / Archivo Black) en toda la pieza, con jerarquía clara de 3 tamaños: headline (el más grande), bullets/subtítulos (mediano), detalles/etiquetas (chico). Nunca todo el texto al mismo tamaño.
- Márgenes: deja al menos 6% del lienzo de margen de seguridad en los 4 bordes — ningún texto, ícono ni badge puede tocar o salirse del borde.
- Espaciado: generoso, con aire entre el headline, los bullets, los íconos y el producto. La pieza debe verse ordenada y premium, no saturada ni amontonada — mejor pocos elementos bien organizados que muchos apretados.
- Íconos: un único estilo lineal (outline, grosor de trazo uniforme) para TODOS los íconos de la pieza, siempre en {COLOR_ACENTO}. Nunca mezclar íconos de línea con íconos rellenos en la misma imagen.
- Tarjetas y bloques de texto: cuando el texto necesite un fondo propio para separarse del fondo general, usa una tarjeta en {COLOR_PANEL} con esquinas redondeadas suaves y una sombra muy sutil — nunca negro ni gris oscuro.
- Fondos: nunca un color plano sin más — todo fondo debe tener al menos dos capas de las siguientes (siempre en tonos {COLOR_PRIMARIO}/{COLOR_ACENTO}, jamás negro): (1) un degradado direccional o radial suave; (2) una o dos formas geométricas grandes y desenfocadas (círculos, blobs orgánicos o bandas diagonales) en {COLOR_ACENTO} con baja opacidad, a modo de acento decorativo detrás del producto o del texto; (3) una textura sutil de bajo contraste (puntos finos, líneas diagonales delgadas o un ruido/grano suave) que le dé profundidad sin competir con el texto. El resultado debe verse trabajado, con capas y movimiento — nunca un color liso tipo diapositiva de PowerPoint.
- Fotografía del producto: iluminación de estudio tipo softbox a 45°, sombra de contacto realista debajo del producto, sin sombras duras ni negras.
- Identidad del producto (regla fija): el logo, la etiqueta, los textos impresos, los colores de marca y las proporciones reales del producto tienen que quedar exactamente como en la foto original. Nunca inventes ni reescribas texto, logos o detalles del producto.
- Libertad de puesta en escena: el producto puede mostrarse con distinta perspectiva, ángulo, posición, inclinación o tipo de render (fotorrealista 3D, con reflejos, flotando, en pedestal, con sombras dinámicas) para dar más creatividad a la pieza — siempre respetando la identidad del producto de arriba.
- Legibilidad en miniatura: el comprador va a ver esta imagen a unos 300x300px en Mercado Libre — todo el texto debe leerse perfectamente a ese tamaño, con alto contraste y sin fuentes finas.
- Consistencia de set: esta pieza es una de varias infografías del mismo producto — usa siempre la misma tipografía, el mismo estilo de ícono y la misma paleta, para que todas se vean como una sola campaña.

Usa como base la imagen adjunta del producto. Solo se compone sobre el fondo generado. LIBERTAD CREATIVA SOBRE EL PRODUCTO: podés cambiar su perspectiva, ángulo o posición para destacarlo mejor — manteniendo intacta su identidad (etiqueta, logo, textos y colores).

Genera una infografía cuadrada de 1200x1200 px para Mercado Libre tipo "aclaración" de {NOMBRE_PRODUCTO}, con foco en un solo mensaje contundente.

COMPOSICIÓN:
- Título en 2 líneas gigante, condensado extra bold mayúsculas: línea 1 en {COLOR_TEXTO} "{ACLARACION_LINEA_1}", línea 2 en {COLOR_ACENTO} mucho más grande "{ACLARACION_LINEA_2}".
- Tarjeta en {COLOR_PANEL} con esquinas redondeadas: ícono grande + dato destacado en {COLOR_ACENTO}, descripción corta debajo en {COLOR_TEXTO}: "{DATO_DESTACADO}" / "{DATO_DESCRIPCION}".
- 2-3 bullets con ícono circular lineal de contorno {COLOR_ACENTO}, texto en {COLOR_TEXTO}: "{DETALLE_1}", "{DETALLE_2}", "{DETALLE_3}".
- El producto (imagen subida) al lado derecho, tamaño medio-grande (45-55% del alto), sombra suave, halo {COLOR_ACENTO} detrás.
- Fondo en {COLOR_PRIMARIO} con una forma geométrica grande (círculo o banda diagonal) en {COLOR_ACENTO} de baja opacidad detrás del título, y una textura sutil de grano o líneas finas en el resto del lienzo.

BARRA INFERIOR (opcional): 2-3 claims con ícono, mismo estilo lineal, texto en {COLOR_TEXTO}: "{CLAIM_FINAL_1}", "{CLAIM_FINAL_2}", "{CLAIM_FINAL_3}".

ESTILO: sigue el SISTEMA DE DISEÑO. Máximo contraste tipográfico, tono directo y confiable.

NO HACER: no incluir afirmaciones de salud, seguridad o certificación que no estén impresas en el producto real, no exagerar cifras, no usar fondo negro ni oscuro.
```

---

## Modelo y parámetros usados (Higgsfield)

- **Modelo**: `marketing-studio/image`
- **Modo**: directo (`enhance_prompt: false`), sin pasar por el sistema de presets propio de Higgsfield
- **Resolución**: `1k`
- **Calidad**: `low` (pedido explícito para minimizar costo por generación, ~1.6¢/imagen)
- **Aspect ratio**: `1:1`
- **Imagen de entrada**: la foto real del producto (URL real de Mercado Libre, o subida por el usuario y alojada temporalmente en Vercel Blob si es necesario)
