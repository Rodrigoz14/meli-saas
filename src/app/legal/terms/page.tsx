import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const LAST_UPDATED = "18 de septiembre de 2026";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-6 py-16">
          <h1 className="font-display text-3xl font-bold tracking-tight">Términos de Servicio</h1>
          <p className="mt-2 text-sm text-muted-foreground">Última actualización: {LAST_UPDATED}</p>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">
            <section>
              <h2 className="font-display text-xl font-semibold">1. Aceptación</h2>
              <p className="mt-2">
                Al usar el panel web o la extensión de navegador de MeliBoost, aceptás estos términos. Si no
                estás de acuerdo, no uses el servicio.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">2. Qué es MeliBoost</h2>
              <p className="mt-2">
                MeliBoost es una herramienta independiente para vendedores de Mercado Libre que calcula
                rentabilidad, controla inventario y ayuda a optimizar publicaciones, usando datos reales que
                tu cuenta de Mercado Libre nos autoriza a leer.{" "}
                <strong>MeliBoost no está afiliado, patrocinado ni respaldado por Mercado Libre.</strong>
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">3. Tu cuenta</h2>
              <p className="mt-2">
                Sos responsable de mantener segura tu cuenta y de la actividad que ocurra a través de tu
                sesión. Conectás tu cuenta de Mercado Libre de forma voluntaria y podés desconectarla en
                cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">4. Datos reales, sin garantía de exactitud absoluta</h2>
              <p className="mt-2">
                Mostramos cálculos de rentabilidad, márgenes y alertas basados en datos reales de la API de
                Mercado Libre y en la información que vos ingresás (costos, impuestos). Aun así, no
                garantizamos que estos cálculos sean exactos en el 100% de los casos — son una herramienta de
                apoyo, no asesoría financiera, legal ni contable. Las decisiones de precios, inventario o
                impuestos son tu responsabilidad.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">5. Funciones con inteligencia artificial</h2>
              <p className="mt-2">
                Algunas funciones (sugerencias de texto, precios e imágenes) usan modelos de inteligencia
                artificial de terceros. Estas sugerencias pueden contener errores o imprecisiones — siempre
                revisá el resultado antes de publicarlo en tu tienda real. En particular, las imágenes
                generadas por IA en el módulo de infografías pueden no representar el producto de forma
                exacta y deben tratarse como material de referencia, no como fotografía final, hasta que
                revises y confirmes que representan correctamente tu producto.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">6. Uso permitido</h2>
              <p className="mt-2">
                No podés usar MeliBoost para actividades ilegales, para sobrecargar o interferir con la API
                de Mercado Libre, ni para intentar acceder a cuentas o datos que no sean tuyos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">7. Cambios y disponibilidad del servicio</h2>
              <p className="mt-2">
                Podemos modificar, agregar o discontinuar funciones del servicio en cualquier momento. Vamos
                a intentar avisar con anticipación los cambios importantes.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">8. Límite de responsabilidad</h2>
              <p className="mt-2">
                MeliBoost se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley, no somos
                responsables por pérdidas o daños derivados del uso del servicio, incluyendo decisiones
                comerciales tomadas en base a los datos o sugerencias que mostramos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">9. Contacto</h2>
              <p className="mt-2">
                Para consultas sobre estos términos, escribinos a <strong>soporte@meliboost.app</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
