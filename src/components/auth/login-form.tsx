"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"meli" | "credentials" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("credentials");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(null);
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <Button
        className="w-full"
        disabled={loading !== null}
        onClick={() => {
          setLoading("meli");
          signIn("mercadolibre", { callbackUrl: "/dashboard" });
        }}
      >
        {loading === "meli" ? "Conectando…" : "Conectar con Mercado Libre"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">o con tu correo</span>
        <Separator className="flex-1" />
      </div>

      <form className="space-y-3" onSubmit={handleCredentialsSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={loading !== null}
        >
          {loading === "credentials" ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
