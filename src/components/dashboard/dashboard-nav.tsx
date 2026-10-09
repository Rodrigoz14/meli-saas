"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, FileText, LayoutDashboard, Receipt, Search, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: TrendingUp },
      { href: "/dashboard/costos-gastos", label: "Costos y gastos", icon: Receipt },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/dashboard/publicaciones", label: "Publicaciones", icon: FileText },
      { href: "/dashboard/busqueda-productos", label: "Búsqueda de productos", icon: Search },
      { href: "/dashboard/inventario", label: "Inventario", icon: Boxes },
    ],
  },
  {
    label: "Cuenta",
    items: [{ href: "/dashboard/configuracion", label: "Configuración", icon: Settings }],
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-[3px] hover:bg-muted hover:text-foreground",
                  isActive &&
                    "bg-gradient-to-r from-primary to-primary-2 font-semibold text-primary-foreground shadow-[0_8px_22px_-8px_var(--glow)] hover:translate-x-0 hover:from-primary hover:to-primary-2 hover:text-primary-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
