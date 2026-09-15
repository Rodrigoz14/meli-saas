import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { PublicationsOptimizer } from "@/components/dashboard/publications-optimizer";
import { getRentabilidadData } from "@/lib/dashboard-data";

export const maxDuration = 60;

export default async function PublicacionesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);

  if (!data.connected) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Todavía no conectaste tu cuenta de Mercado Libre
        </h1>
        <p className="max-w-md text-muted-foreground">
          Necesitamos acceso a tus publicaciones para optimizarlas con IA.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  const products = data.rows.map((row) => ({
    productId: row.productId,
    title: row.title,
    thumbnail: row.thumbnail,
    permalink: row.permalink,
  }));

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Publicaciones</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Genera un título optimizado y una descripción para Mercado Libre con IA — a partir de una de tus
        publicaciones reales o desde cero.
      </p>

      <div className="mt-8">
        <PublicationsOptimizer products={products} />
      </div>
    </div>
  );
}
