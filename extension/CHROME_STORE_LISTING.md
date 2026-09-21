# Chrome Web Store — Ficha de publicación de MeliBoost

Referencia para completar el formulario del [Chrome Web Store Developer
Dashboard](https://chrome.google.com/webstore/devconsole). No es código —
copiá/pegá estas respuestas directamente en el formulario al subir
`extension-dist.zip` (generado con `npm run build:extension`).

## Antes de subir

- [ ] Publicar la política de privacidad (`/legal/privacy`, ya creada en este
  proyecto) y tener la URL pública a mano: `https://meli-saas.vercel.app/legal/privacy`
- [ ] Correr `npm run build:extension` y usar `extension-dist.zip` (esa
  versión ya no tiene `localhost:3000` en los permisos)
- [ ] Tener listas al menos 1 captura de pantalla (1280×800 o 640×400) y,
  si se puede, el tile promocional pequeño (440×280)

## Store listing

**Nombre**: MeliBoost

**Resumen corto** (máx. 132 caracteres):
> Herramienta independiente (no afiliada a Mercado Libre) para vendedores: rentabilidad, inventario y búsqueda de productos.

**Descripción larga** (sugerida):
> MeliBoost es una herramienta independiente para vendedores de Mercado
> Libre — **no afiliada, patrocinada ni respaldada por Mercado Libre**.
>
> Conectá tu cuenta de Mercado Libre para:
> - Ver tu rentabilidad real por publicación (comisión, envío, Ads y costos
>   reales, no estimaciones).
> - Recibir alertas de inventario y quiebre de stock según tu venta real.
> - Buscar productos y nichos directamente desde el panel lateral del
>   navegador, con datos reales de resultados de búsqueda de Mercado Libre.
>
> Todos los cálculos usan datos reales de la API oficial de Mercado Libre.
> Tu contraseña de Mercado Libre nunca pasa por MeliBoost.

**Categoría**: Productividad (o "Herramientas para desarrolladores"/"Shopping" según disponibilidad)

**Idioma**: Español (Latinoamérica)

## Política de privacidad (campo obligatorio)

`https://meli-saas.vercel.app/legal/privacy`

## Justificación de permisos (Chrome pide explicar cada uno)

- **`scripting`**: se usa para leer los resultados de búsqueda reales que
  Mercado Libre ya muestra en pantalla (título, precio, cantidad vendida)
  cuando el usuario busca un producto desde el panel — necesario para
  mostrar datos de mercado reales.
- **`tabs`**: la extensión abre una pestaña real de resultados de búsqueda
  de Mercado Libre para leerla, y necesita administrar esa pestaña
  (crearla, esperar que cargue, cerrarla) sin interrumpir la pestaña que el
  usuario estaba usando.
- **`storage`**: guarda localmente la sesión y preferencias del usuario, y
  un log corto de diagnóstico (nunca sale del dispositivo) para poder
  investigar errores si el usuario reporta uno.
- **`sidePanel`**: es la superficie de la extensión — todo el panel de
  MeliBoost se muestra en el side panel nativo de Chrome.
- **`host_permissions` (dominios de mercadolibre.com/.com.co/.com.ar/etc.)**:
  necesarios para abrir e inyectar el script de lectura de resultados en
  las páginas reales de búsqueda de cada país. Sin esto la función de
  búsqueda de productos no puede funcionar.
- **`host_permissions` (meli-saas.vercel.app)**: para comunicarse con el
  panel web de MeliBoost cuando está abierto en una pestaña (autenticación
  y datos del dashboard).

## Uso de datos (formulario "Data usage" / justificación de permisos)

Declarar que la extensión:
- ✅ Recolecta datos de **actividad del sitio web** — pero aclarar: **solo**
  en dominios de mercadolibre.com (para leer resultados de búsqueda
  públicos) y en meli-saas.vercel.app (la propia app). No en ningún otro
  sitio.
- ✅ Recolecta **información de autenticación de usuario** — el token OAuth
  de Mercado Libre, gestionado por el backend de MeliBoost, nunca visible
  en la extensión en texto plano más allá de la sesión activa.
- ❌ No recolecta ubicación, datos financieros de tarjetas, historial de
  navegación fuera de los dominios mencionados, ni datos de salud/comunicación
  personal.
- ✅ Los datos se usan **únicamente** para el funcionamiento de la
  extensión (mostrar rentabilidad e insights reales al propio vendedor) —
  no se venden ni se usan para publicidad de terceros.

Enlace obligatorio a certificar: "I do not sell or transfer user data to
third parties outside of the approved use cases" — **se puede certificar
que sí cumple**, ya que los proveedores externos (Anthropic, Cloudflare,
Hugging Face) solo procesan datos para ejecutar la función que el usuario
pidió (texto, imágenes), no para sus propios fines.

## Nombre y marca — riesgo a tener en cuenta

"MeliBoost" usa el prefijo "Meli" asociado a Mercado Libre. No hay
afiliación real, y el disclaimer ya está en la descripción corta y larga.
Si Mercado Libre o Google llegaran a objetar el nombre en la revisión, el
plan B es renombrar la extensión (ej. "Boost para Vendedores" o similar)
— evaluarlo si la primera revisión lo señala.
