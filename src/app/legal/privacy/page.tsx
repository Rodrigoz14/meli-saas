import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const LAST_UPDATED = "18 de septiembre de 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-display text-3xl font-bold tracking-tight">Política de Privacidad</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última actualización: {LAST_UPDATED}</p>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">
            <section>
              <h2 className="font-display text-xl font-semibold">1. Quiénes somos</h2>
              <p className="mt-2">
                MeliBoost (&ldquo;nosotros&rdquo;) es una herramienta independiente para vendedores de Mercado Libre.
                <strong> No estamos afiliados, patrocinados ni respaldados por Mercado Libre, Mercado Pago
                ni ninguna de sus empresas relacionadas.</strong> Ofrecemos un panel web y una extensión de
                navegador que ayudan a vendedores a calcular su rentabilidad real, gestionar su inventario y
                optimizar sus publicaciones, usando datos que su propia cuenta de Mercado Libre nos autoriza
                a leer.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">2. Qué datos recolectamos</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong>Datos de tu cuenta de Mercado Libre:</strong> cuando conectás tu cuenta (OAuth),
                  recibimos tu ID de usuario, nickname, email, sitio/país y nivel de reputación como
                  vendedor. Nunca vemos ni almacenamos tu contraseña de Mercado Libre.
                </li>
                <li>
                  <strong>Tokens de acceso OAuth:</strong> guardamos el token de acceso y de refresco que
                  Mercado Libre nos entrega para poder consultar tus datos en tu nombre. Se almacenan
                  cifrados en nuestra base de datos y se usan únicamente para llamar a la API oficial de
                  Mercado Libre.
                </li>
                <li>
                  <strong>Datos reales de tu negocio:</strong> publicaciones, precios, órdenes/ventas,
                  comisiones, costos de envío, métricas de Ads y facturación — los leemos en vivo desde la
                  API de Mercado Libre cada vez que abrís el panel, para mostrarte tu rentabilidad real. No
                  guardamos un historial permanente de tus ventas; sí guardamos los costos de producto
                  (COGS), gastos operativos e impuestos que vos mismo ingresás manualmente.
                </li>
                <li>
                  <strong>Fotos de producto que subís:</strong> si usás el generador de infografías, la foto
                  se procesa para generar imágenes de marketing (ver sección 4, proveedores de IA).
                </li>
                <li>
                  <strong>Datos de la extensión de navegador:</strong> cuando usás la función de búsqueda de
                  productos, la extensión abre páginas reales de resultados de búsqueda de Mercado Libre y
                  lee la información pública que ya se muestra ahí (título, precio, cantidad vendida) para
                  armar el resumen de mercado que ves en el panel lateral. No accedemos a tu navegación en
                  otros sitios ni a pestañas que no sean de Mercado Libre o de MeliBoost.
                </li>
                <li>
                  <strong>Datos técnicos básicos:</strong> cookies de sesión para mantenerte conectado, y
                  registros de errores del servidor (sin datos personales sensibles) para poder corregir
                  fallas.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">3. Para qué usamos tus datos</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Calcular tu rentabilidad, márgenes y costos reales por publicación.</li>
                <li>Mostrarte alertas de inventario y quiebre de stock basadas en tu venta real.</li>
                <li>Generar sugerencias de texto, precios e infografías para tus publicaciones.</li>
                <li>Mantener tu sesión iniciada y tu cuenta conectada a Mercado Libre.</li>
                <li>Mejorar el funcionamiento del producto y corregir errores.</li>
              </ul>
              <p className="mt-2">
                No vendemos tus datos. No los usamos para publicidad dirigida ni los compartimos con
                terceros con fines comerciales ajenos al funcionamiento de MeliBoost.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">4. Con quién compartimos datos</h2>
              <p className="mt-2">
                Para poder ofrecer el servicio, algunos datos pasan por proveedores externos, únicamente
                para procesar la función correspondiente:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li><strong>Mercado Libre:</strong> como fuente de tus datos reales (API oficial).</li>
                <li>
                  <strong>Anthropic (Claude):</strong> para generar textos, sugerencias de precio y
                  analizar fotos de producto (por ejemplo, para sugerir un color de diseño).
                </li>
                <li>
                  <strong>Cloudflare Workers AI y Hugging Face:</strong> para generar y procesar imágenes
                  cuando usás el generador de infografías.
                </li>
                <li>
                  <strong>Neon (base de datos) y Vercel (hosting):</strong> infraestructura donde corre y se
                  almacena la aplicación.
                </li>
              </ul>
              <p className="mt-2">
                Cada uno de estos proveedores procesa los datos según sus propias políticas de privacidad y
                únicamente recibe lo necesario para cumplir su función puntual.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">5. Cuánto tiempo guardamos tus datos</h2>
              <p className="mt-2">
                Guardamos tus datos mientras tu cuenta esté activa. Si desconectás tu cuenta de Mercado
                Libre o pedís la eliminación de tu cuenta, borramos tus tokens de acceso y los datos que
                hayas ingresado manualmente (costos, impuestos) dentro de un plazo razonable, salvo que la
                ley nos obligue a conservar algún registro por más tiempo.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">6. Tus derechos</h2>
              <p className="mt-2">
                Podés desconectar tu cuenta de Mercado Libre en cualquier momento desde la configuración de
                MeliBoost. Podés pedirnos acceso, corrección o eliminación de tus datos personales
                escribiéndonos a <strong>soporte@meliboost.app</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">7. Seguridad</h2>
              <p className="mt-2">
                Los tokens de acceso y datos sensibles se almacenan cifrados. El acceso a la base de datos
                está restringido y las conexiones usan cifrado en tránsito (HTTPS/TLS). Ningún sistema es
                100% infalible, pero tomamos medidas razonables para proteger tu información.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">8. Cambios a esta política</h2>
              <p className="mt-2">
                Si actualizamos esta política de forma significativa, lo vamos a indicar en esta misma
                página con la fecha de actualización.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">9. Contacto</h2>
              <p className="mt-2">
                Para cualquier consulta sobre privacidad o tus datos, escribinos a{" "}
                <strong>soporte@meliboost.app</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
