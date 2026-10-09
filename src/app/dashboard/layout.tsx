import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const displayName = session.user.name ?? session.user.email ?? "";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div
      className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)]"
      style={{ "--font-display-raw": "var(--font-body)" } as React.CSSProperties}
    >
      <aside className="sticky top-0 h-screen py-4 pl-4">
        <div className="flex h-full flex-col gap-[18px] rounded-[22px] border border-border bg-card p-[18px_12px]">
          <Logo className="px-3" />
          <DashboardNav />
          <div className="mt-auto flex flex-col gap-2 rounded-2xl bg-muted p-2.5">
            <div className="flex items-center gap-2.5 px-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-sm font-bold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="outline"
                type="submit"
                className="w-full hover:border-destructive hover:text-destructive"
              >
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="relative flex flex-col gap-4 overflow-x-hidden p-4 pb-12">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-float absolute top-[-10%] right-[-5%] h-[420px] w-[420px] rounded-full bg-[var(--glow)] opacity-20 blur-[90px]" />
          <div
            className="animate-float absolute bottom-[-10%] left-[20%] h-[360px] w-[360px] rounded-full bg-[var(--glow-secondary)] opacity-15 blur-[80px]"
            style={{ animationDelay: "-7s" }}
          />
        </div>
        {children}
      </main>
    </div>
  );
}
