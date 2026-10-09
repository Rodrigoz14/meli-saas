import { Loader2 } from "lucide-react";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-mb-shimmer rounded-lg bg-muted ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[22px] border border-border bg-card p-4">
        <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando Dashboard · sincronizando con Mercado Libre</p>
        <div className="absolute inset-x-0 bottom-0 h-[4px] overflow-hidden bg-transparent">
          <div
            className="animate-indeterminate-bar absolute h-full w-[40%] rounded-full bg-gradient-to-r from-primary to-primary-2"
            style={{ left: "-110%" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-7 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="mt-4 h-4 w-full" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-9 w-40" />
          <SkeletonBlock className="mt-3 h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
