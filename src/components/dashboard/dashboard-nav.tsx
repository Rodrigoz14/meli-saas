"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Rentabilidad", icon: Wallet },
  { href: "/dashboard/busqueda-productos", label: "Búsqueda de productos", icon: Search },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/60 bg-background/80">
      <div className="container mx-auto flex h-11 items-center gap-6 px-6">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                isActive && "font-medium text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
