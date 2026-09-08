import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Logo } from "@/components/marketing/logo";
import { nav } from "@/lib/marketing-data";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            render={<Link href="/login" />} nativeButton={false}
            className="hidden sm:inline-flex"
          >
            Iniciar sesión
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false}>Conectar con Mercado Libre</Button>
        </div>
      </div>
    </header>
  );
}
