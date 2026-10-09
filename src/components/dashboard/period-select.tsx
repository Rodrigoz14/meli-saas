"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [7, 15, 30, 60, 90];
const SEGMENT_WIDTH = 52;

export function PeriodSelect({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeIndex = Math.max(0, PERIOD_OPTIONS.indexOf(days));

  return (
    <div className="relative flex items-center rounded-[13px] border border-border bg-muted p-1">
      <div
        className="absolute top-1 left-1 z-0 h-[30px] rounded-[10px] bg-gradient-to-r from-primary to-primary-2 shadow-[0_6px_16px_-6px_var(--glow)] transition-transform duration-400 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ width: SEGMENT_WIDTH, transform: `translateX(${activeIndex * SEGMENT_WIDTH}px)` }}
        aria-hidden
      />
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option === days;
        return (
          <button
            key={option}
            type="button"
            onClick={() => router.push(`${pathname}?days=${option}`)}
            style={{ width: SEGMENT_WIDTH }}
            className={cn(
              "relative z-10 h-[30px] rounded-[10px] text-[13px] font-bold transition-colors duration-300",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}d
          </button>
        );
      })}
    </div>
  );
}
