import { ProductSearch } from "@/components/dashboard/product-search";

export default function BusquedaProductosPage() {
  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold">Búsqueda de productos</h1>
      <p className="mt-1 text-muted-foreground">
        Analiza cualquier nicho antes de invertir: demanda, competencia y
        facturación estimada de las publicaciones que ya existen en Mercado
        Libre para esa búsqueda.
      </p>

      <div className="mt-8">
        <ProductSearch />
      </div>
    </div>
  );
}
