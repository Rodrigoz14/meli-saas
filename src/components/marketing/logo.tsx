import { Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-display text-lg font-bold tracking-tight",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground">
        <Zap className="h-4 w-4" fill="currentColor" />
      </span>
      MeliBoost
    </Link>
  );
}
