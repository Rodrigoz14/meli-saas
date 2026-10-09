import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Unbounded } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const bodyFont = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
});

const displayFont = Unbounded({
  variable: "--font-display-raw",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono-raw",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
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
