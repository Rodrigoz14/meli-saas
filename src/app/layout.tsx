import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Unbounded } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Unbounded({
  variable: "--font-display-raw",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

// Tipografía del panel (app/dashboard) — más limpia y estándar que Unbounded
// (reservada para la landing), inspirada en la tipografía de Selltrix.
const dashboardDisplayFont = Plus_Jakarta_Sans({
  variable: "--font-dashboard-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MeliBoost — Inteligencia de Marketplace para vendedores de Mercado Libre",
  description:
    "Calcula tu rentabilidad real, controla tu inventario y optimiza tus publicaciones de Mercado Libre con datos e inteligencia artificial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} ${dashboardDisplayFont.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
