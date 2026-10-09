import { ProductSearch } from "@/components/dashboard/product-search";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";

export default function BusquedaProductosPage() {
  return (
    <>
      <DashboardTitleBar
        title="Búsqueda de productos"
        subtitle="Analiza cualquier nicho antes de invertir: demanda, competencia y facturación estimada de las publicaciones que ya existen en Mercado Libre para esa búsqueda."
      />

      <ProductSearch />
    </>
  );
}
