import Link from "next/link";
import { Button } from "@/components/ui/button";

// Mismo aviso de "conectá tu cuenta" que necesitan las 3 páginas de
// Publicaciones (SEO, Descripción, Imágenes) cuando el usuario todavía no
// conectó Mercado Libre — antes vivía duplicado en cada page.tsx.
export function ConnectMeliPrompt() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Todavía no conectaste tu cuenta de Mercado Libre</h1>
      <p className="max-w-md text-muted-foreground">Necesitamos acceso a tus publicaciones para optimizarlas con IA.</p>
      <Button render={<Link href="/login" />} nativeButton={false}>
        Conectar con Mercado Libre
      </Button>
    </div>
  );
}
