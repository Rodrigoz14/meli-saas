"use client";

import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [7, 15, 30, 60, 90];

export function PeriodSelect({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted">
        Últimos {days} días
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {PERIOD_OPTIONS.map((option) => {
          const isActive = option === days;
          return (
            <DropdownMenuItem
              key={option}
              onClick={() => router.push(`${pathname}?days=${option}`)}
              className={cn("justify-between", isActive && "bg-primary/15 font-semibold text-primary")}
            >
              Últimos {option} días
              {isActive && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
