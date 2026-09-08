import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="container mx-auto px-6 pb-20 md:pb-28">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center text-primary-foreground md:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.25),transparent)]"
          aria-hidden
        />
        <h2 className="relative font-display text-3xl font-bold tracking-tight md:text-4xl">
          Empieza a vender con inteligencia hoy
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/90">
          Conecta tu cuenta de Mercado Libre y descubre tu rentabilidad real en
          menos de 5 minutos.
        </p>
        <Button
          size="lg"
          variant="secondary"
          render={<Link href="/login" />} nativeButton={false}
          className="relative mt-8"
        >
          Conectar con Mercado Libre
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
