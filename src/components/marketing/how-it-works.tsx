import { steps } from "@/lib/marketing-data";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="container mx-auto px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
          Cómo funciona
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          De conectar tu cuenta a decisiones basadas en datos
        </h2>
        <p className="mt-4 text-muted-foreground">
          Sin hojas de cálculo, sin adivinar. MeliBoost hace el trabajo pesado por ti.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.number} className="relative rounded-2xl border border-border bg-card p-8">
            <span className="font-display text-4xl font-bold text-primary/25">
              {step.number}
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
