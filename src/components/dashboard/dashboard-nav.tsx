"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Receipt, Search, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: TrendingUp },
  { href: "/dashboard/costos-gastos", label: "Costos y gastos", icon: Receipt },
  { href: "/dashboard/busqueda-productos", label: "Búsqueda de productos", icon: Search },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-16 z-40 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center gap-2 px-6">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-base text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground",
                isActive &&
                  "bg-primary/10 font-semibold text-primary shadow-[0_0_16px_-4px_var(--primary)] hover:bg-primary/15 hover:text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
