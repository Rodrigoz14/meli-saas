import { Logo } from "@/components/marketing/logo";
import { LoginForm } from "@/components/auth/login-form";
import { heroStats } from "@/lib/marketing-data";

export default function LoginPage() {
  return (
    <div
      className="grid min-h-screen lg:grid-cols-2"
      style={{ "--font-display-raw": "var(--font-body)" } as React.CSSProperties}
    >
      <div className="relative m-4 hidden overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-secondary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-[-10%] right-[-10%] h-[420px] w-[420px] rounded-full bg-white/15 blur-[90px]" />
          <div
            className="animate-float absolute bottom-[-15%] left-[-5%] h-[360px] w-[360px] rounded-full bg-white/10 blur-[80px]"
            style={{ animationDelay: "-7s" }}
          />
        </div>

        <Logo className="relative text-primary-foreground" />

        <div className="relative">
          <h1 className="font-display text-[56px] leading-[0.98] font-extrabold tracking-[-0.045em] lg:text-[64px]">
            Cuánto ganas de verdad, en un solo panel.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Rentabilidad real, inventario y publicaciones de Mercado Libre, con datos e inteligencia artificial.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[heroStats[0], heroStats[2], { value: "OAuth", label: "oficial" }].map((chip) => (
              <span
                key={chip.label}
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
              >
                {chip.value} {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-16">
        <Logo className="mb-8 lg:hidden" />

        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
          <h2 className="font-display text-xl font-semibold">Bienvenido de vuelta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecta tu cuenta de Mercado Libre o inicia sesión con tu correo.
          </p>

          <LoginForm />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Seguro y encriptado. Nunca almacenamos tu contraseña de Mercado Libre.
        </p>
      </div>
    </div>
  );
}
