import { Loader2 } from "lucide-react";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-mb-shimmer rounded-lg bg-muted ${className ?? ""}`} />;
}

export function PublicacionesLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[22px] border border-border bg-card p-4">
        <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="absolute inset-x-0 bottom-0 h-[4px] overflow-hidden bg-transparent">
          <div
            className="animate-indeterminate-bar absolute h-full w-[40%] rounded-full bg-gradient-to-r from-primary to-primary-2"
            style={{ left: "-110%" }}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-24 w-full" />
        </div>
        <div className="min-h-[420px] rounded-2xl border border-dashed border-border p-5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="mt-4 h-5 w-full" />
          <SkeletonBlock className="mt-2 h-5 w-5/6" />
          <SkeletonBlock className="mt-2 h-5 w-2/3" />
        </div>
      </div>
    </div>
  );
}
