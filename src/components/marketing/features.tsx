import { cn } from "@/lib/utils";
import { features } from "@/lib/marketing-data";

const accentIconClass = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  destructive: "bg-destructive/15 text-destructive",
  image: "bg-white/15 text-white",
  gradient: "bg-white/20 text-white",
} as const;

export function Features() {
  return (
    <section id="producto" className="container mx-auto px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
          Producto
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Todo lo que necesitas para vender con rentabilidad
        </h2>
        <p className="mt-4 text-muted-foreground">
          Un solo panel que reemplaza tus hojas de cálculo, tus estimaciones y tus
          herramientas sueltas.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-12 md:auto-rows-[minmax(200px,auto)]">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isImage = feature.accent === "image";
          const isGradient = feature.accent === "gradient";

          return (
            <div
              key={feature.title}
              style={
                isImage
                  ? {
                      backgroundImage:
                        "radial-gradient(120% 120% at 100% 0%, color-mix(in oklch, var(--primary) 90%, transparent), hsl(234 45% 10%) 60%)",
                    }
                  : undefined
              }
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border p-8 transition-all duration-300",
                feature.span,
                isImage && "border-transparent text-white",
                isGradient &&
                  "border-transparent bg-gradient-to-br from-primary to-secondary text-primary-foreground",
                !isImage && !isGradient && "bg-card/60 backdrop-blur-md hover:border-primary/50",
              )}
            >
              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-lg",
                  accentIconClass[feature.accent],
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3
                className={cn(
                  "font-display text-xl font-semibold",
                  (isImage || isGradient) && "text-white",
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "mt-3 max-w-md leading-relaxed",
                  isImage || isGradient ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
