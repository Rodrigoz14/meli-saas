import { PublicacionesTabs } from "@/components/dashboard/publicaciones-tabs";
import { DashboardTitleBar } from "@/components/dashboard/dashboard-title-bar";

export const maxDuration = 60;

export default function PublicacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardTitleBar
        title="Publicaciones"
        subtitle="Optimizador SEO, descripción e infografías con IA — cada paso reutiliza lo que ya generaste en el anterior."
      />

      <PublicacionesTabs />

      {children}
    </>
  );
}
