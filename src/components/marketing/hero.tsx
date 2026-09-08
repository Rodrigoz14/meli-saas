import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { heroStats } from "@/lib/marketing-data";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)",
        }}
        aria-hidden
      />

      <div className="container mx-auto grid gap-16 px-6 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            Vende más. Pierde menos.
          </p>

          <div className="mt-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Control total de tu rentabilidad
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl lg:text-6xl">
            Maximiza tus{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ganancias
            </span>{" "}
            en Mercado Libre
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-balance">
            Calcula tu utilidad real, controla costos de envío, gestiona inventario
            y optimiza tus publicaciones con IA. Todo desde un solo panel.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
            <Button
              size="lg"
              render={<Link href="/login" />} nativeButton={false}
              className="w-full sm:w-auto"
            >
              Conectar con Mercado Libre
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<a href="#producto" />} nativeButton={false}
              className="w-full sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" />
              Ver cómo funciona
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Seguro y encriptado. Nunca almacenamos tu contraseña de Mercado Libre.
          </p>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-bold md:text-3xl">
                  {stat.value}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
