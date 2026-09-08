import { Logo } from "@/components/marketing/logo";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-6 py-16">
      <Logo className="mb-8" />

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h1 className="font-display text-xl font-semibold">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecta tu cuenta de Mercado Libre o inicia sesión con tu correo.
        </p>

        <LoginForm />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Seguro y encriptado. Nunca almacenamos tu contraseña de Mercado Libre.
      </p>
    </div>
  );
}
