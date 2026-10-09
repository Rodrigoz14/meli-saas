import type { ReactNode } from "react";
import { ModeToggle } from "@/components/mode-toggle";

export function DashboardTitleBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative z-25 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border bg-card p-4 sm:p-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <ModeToggle />
      </div>
    </div>
  );
}
