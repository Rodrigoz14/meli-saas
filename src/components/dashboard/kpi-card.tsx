import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  primary: "shadow-[0_18px_36px_-20px_var(--glow)] hover:shadow-[0_18px_36px_-20px_var(--glow)]",
  secondary: "shadow-[0_18px_36px_-20px_var(--glow-secondary)] hover:shadow-[0_18px_36px_-20px_var(--glow-secondary)]",
  success: "shadow-[0_18px_36px_-20px_var(--glow-secondary)] hover:shadow-[0_18px_36px_-20px_var(--glow-secondary)]",
  warning: "shadow-[0_18px_36px_-20px_rgba(229,154,11,.45)]",
  danger: "shadow-[0_18px_36px_-20px_rgba(192,24,47,.45)]",
  neutral: "",
};

const ICON_TONE_CLASSES: Record<string, string> = {
  primary: "bg-accent text-accent-foreground",
  secondary: "bg-success-bg text-success",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-[3px] hover:border-[rgba(33,64,237,0.35)]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", ICON_TONE_CLASSES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-[-0.02em] text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
