import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/marketing/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--font-display-raw": "var(--font-dashboard-display)" } as React.CSSProperties}
    >
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.name ?? session.user.email}
            </span>
            <ModeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" type="submit">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </header>
      <DashboardNav />
      <main className="flex-1 bg-muted/20">{children}</main>
    </div>
  );
}
