"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Rentabilidad" },
  { href: "/dashboard/busqueda-productos", label: "Búsqueda de productos" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/60 bg-background/80">
      <div className="container mx-auto flex h-11 items-center gap-6 px-6">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "text-sm text-muted-foreground transition-colors hover:text-foreground",
                isActive && "font-medium text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
