"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, FileText, LayoutDashboard, Receipt, Search, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/rentabilidad", label: "Rentabilidad", icon: TrendingUp },
  { href: "/dashboard/costos-gastos", label: "Costos y gastos", icon: Receipt },
  { href: "/dashboard/publicaciones", label: "Publicaciones", icon: FileText },
  { href: "/dashboard/busqueda-productos", label: "Búsqueda de productos", icon: Search },
  { href: "/dashboard/inventario", label: "Inventario", icon: Boxes },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-16 z-40 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-lg">
      {/* Sin flex-wrap las pestañas se apretaban hasta partir el texto en
          varias líneas y forzaban TODA la página a desbordar horizontalmente
          en mobile (confirmado real: quedaba menos de la mitad del ancho de
          pantalla usable). Ahora la fila no se achica — se scrollea
          horizontalmente dentro de la barra nomás, sin tocar el resto de la
          página, igual que una tab bar de app nativa. */}
      <div className="container mx-auto overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-16 w-max min-w-full items-center gap-2">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-2.5 text-base text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground",
                  isActive &&
                    "bg-primary/10 font-semibold text-primary shadow-[0_0_16px_-4px_var(--primary)] hover:bg-primary/15 hover:text-primary",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
