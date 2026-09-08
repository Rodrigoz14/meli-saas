# MeliBoost

Inteligencia de marketplace para vendedores de Mercado Libre (SaaS completo, clon
mejorado de selltrix.ai). Nombre y copy son placeholder — ver el plan completo en
`C:\Users\Usuario\.claude\plans\gleaming-greeting-cat.md`.

## Estado actual

- **Fase 1-2 (landing pública)**: hecha. Hero, prueba social, cómo funciona,
  features (bento grid), pricing, FAQ, CTA final y footer. SSR/SSG (mejora sobre
  el original, que es una SPA pura sin SEO).
- **Fase 3 (auth, parcial)**: página `/login` con Auth.js v5 — login por
  credenciales (email/contraseña) funcional contra Prisma, y provider OAuth de
  Mercado Libre ya cableado en `src/auth.ts` pero **sin probar**: falta que
  registres la Developer App (ver Fase 0 abajo).
- **Fase 1 (datos)**: schema de Prisma completo (`prisma/schema.prisma`) con
  todas las entidades del plan (usuarios, suscripciones, créditos, productos,
  inventario, análisis de nichos, SEO, imágenes generadas, soporte). Validado y
  generado, pero sin base de datos real conectada todavía.
- **Pendiente**: dashboard, billing con Stripe, generación con IA (texto e
  imágenes), soporte con IA, panel admin, extensión de Chrome — según las Fases
  4 a 10 del plan.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui (base-ui) ·
Prisma 7 (driver adapter `@prisma/adapter-pg`) · Auth.js v5 (NextAuth beta).

**Nota sobre versiones**: este proyecto usa versiones muy recientes con cambios
de breaking respecto a lo habitual (Next 16 con `LayoutProps<'/'>` tipado,
shadcn sobre `base-ui` en vez de Radix — usa `render={<Link/>}` en vez de
`asChild` —, y Prisma 7 que requiere un driver adapter explícito). Revisa
`node_modules/next/dist/docs/` si algo no se comporta como esperas.

## Setup local

```bash
npm install
cp .env.example .env   # completa las variables que ya tengas
npm run dev
```

Para que el login por correo y el flujo de créditos/inventario funcionen de
verdad necesitas una base de datos Postgres real:

```bash
# con Neon, Supabase, o Postgres local — pon la URL en DATABASE_URL
npx prisma migrate dev --name init
```

## Fase 0 — prerrequisitos pendientes (acción tuya)

1. Registrar una **Developer App** en https://developers.mercadolibre.com
   (distinto de tu cuenta de vendedor) → `MERCADOLIBRE_CLIENT_ID` /
   `MERCADOLIBRE_CLIENT_SECRET`. El endpoint de autorización en
   `src/auth.ts` usa el dominio de Colombia (`auth.mercadolibre.com.co`) por
   defecto — ajústalo si tu app apunta a otro sitio.
2. API key de Anthropic en https://console.anthropic.com →
   `ANTHROPIC_API_KEY` (para descripciones, títulos SEO, análisis de nicho).
3. Proveedor de generación de imágenes (OpenAI Images / Stability) + remoción
   de fondo (remove.bg) para la Fase 7.
4. Cuenta de Stripe → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, y los
   `STRIPE_PRICE_ID_*` de cada plan.
5. Base de datos Postgres (Neon o Supabase recomendados).

## Verificación / QA

`scripts/qa-screenshot.mjs` levanta Playwright contra `localhost:3000`, toma
capturas de cada sección en claro/oscuro y reporta errores de consola —
útil para revisar visualmente tras cambios grandes de UI.
