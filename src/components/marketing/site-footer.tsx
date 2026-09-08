import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

const columns = [
  {
    title: "Producto",
    links: [
      { label: "Características", href: "#producto" },
      { label: "Precios", href: "#precios" },
      { label: "Preguntas frecuentes", href: "#faq" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { label: "Sobre nosotros", href: "/about" },
      { label: "Contacto", href: "/contact" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos de servicio", href: "/legal/terms" },
      { label: "Política de privacidad", href: "/legal/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="container mx-auto grid gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Inteligencia de marketplace para vendedores de Mercado Libre en toda
            Latinoamérica.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h4 className="text-sm font-semibold">{column.title}</h4>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 py-6">
        <p className="text-center text-sm text-muted-foreground/70">
          © {new Date().getFullYear()} MeliBoost. Datos seguros y encriptados.
        </p>
      </div>
    </footer>
  );
}
