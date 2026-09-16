import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicationsOptimizer } from "@/components/dashboard/publications-optimizer";
import { InfographicGenerator } from "@/components/dashboard/infographic-generator";
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
        Genera título, descripción e infografías optimizadas para Mercado Libre con IA.
      </p>

      <Tabs defaultValue="texto" className="mt-8">
        <TabsList>
          <TabsTrigger value="texto">Título y Descripción</TabsTrigger>
          <TabsTrigger value="infografia">Infografía</TabsTrigger>
        </TabsList>
        <TabsContent value="texto" className="mt-6">
          <PublicationsOptimizer products={products} />
        </TabsContent>
        <TabsContent value="infografia" className="mt-6">
          <InfographicGenerator products={products} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
