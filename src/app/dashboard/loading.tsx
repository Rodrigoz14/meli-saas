import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-3 px-6 py-32 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Cargando métricas…</p>
    </div>
  );
}
