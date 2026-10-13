import { PublicacionesTabs } from "@/components/dashboard/publicaciones-tabs";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";

export const maxDuration = 60;

export default function PublicacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardTitleBar
        title="Publicaciones"
        subtitle="Optimiza título, descripción e imágenes con IA y publícalos directo en Mercado Libre."
      />

      <PublicacionesTabs />

      {children}
    </>
  );
}
