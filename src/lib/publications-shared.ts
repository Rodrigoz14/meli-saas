import type { RentabilidadData } from "@/lib/dashboard-data";

// Las 3 páginas de Publicaciones (SEO, Descripción, Imágenes) parten todas
// del mismo listado de productos reales — este mapeo vivía duplicado en
// cada page.tsx; ahora vive una sola vez. `categoryId` se agrega acá (antes
// se perdía) para que el Optimizador SEO pueda usar la categoría real de la
// publicación en vez de tener que detectarla desde cero.
export type PublicationProduct = {
  productId: string;
  title: string;
  thumbnail: string;
  permalink: string;
  categoryId: string;
};

export function getPublicationProducts(data: RentabilidadData & { connected: true }): PublicationProduct[] {
  return data.rows.map((row) => ({
    productId: row.productId,
    title: row.title,
    thumbnail: row.thumbnail,
    permalink: row.permalink,
    categoryId: row.categoryId,
  }));
}
