import { PublicacionesTabs } from "@/components/dashboard/publicaciones-tabs";

export const maxDuration = 60;

export default function PublicacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Publicaciones</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Optimizador SEO, descripción e infografías con IA — cada paso reutiliza lo que ya generaste en el anterior.
      </p>

      <PublicacionesTabs />

      <div className="mt-6">{children}</div>
    </div>
  );
}
