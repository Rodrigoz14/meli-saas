import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pricingPlans } from "@/lib/marketing-data";

export function Pricing() {
  return (
    <section id="precios" className="border-t border-border/60 bg-muted/20 py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
            Precios
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Un plan para cada etapa de tu negocio
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cancela cuando quieras. Los créditos de IA adicionales se compran por
            separado sin cambiar de plan.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-8",
                plan.highlighted
                  ? "border-primary bg-card shadow-2xl shadow-primary/20 lg:-translate-y-3"
                  : "border-border bg-card/60",
              )}
            >
              {plan.highlighted && (
                <span className="mb-4 w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  Más elegido
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <Button
                render={<Link href="/login" />} nativeButton={false}
                className="mt-6"
                variant={plan.highlighted ? "default" : "outline"}
              >
                {plan.cta}
              </Button>

              <ul className="mt-8 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    <span className="text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Precios de referencia en USD. Se ajustan automáticamente a la moneda local
          de tu sitio de Mercado Libre.
        </p>
      </div>
    </section>
  );
}
