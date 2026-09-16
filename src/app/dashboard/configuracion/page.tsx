import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ensureFreshMeliToken, getMeliUserProfile } from "@/lib/meli-api";
import { SettingsSection } from "@/components/dashboard/settings-section";

export default async function ConfiguracionPage() {
  const session = await auth();
  const userId = session!.user.id;

  const accessToken = await ensureFreshMeliToken(userId);
  const meliProfile = accessToken ? await getMeliUserProfile(accessToken).catch(() => null) : null;

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Configuración</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Tu cuenta de MeliBoost y tu conexión con Mercado Libre.</p>

      <div className="mt-8">
        <SettingsSection
          accountName={session!.user.name ?? null}
          accountEmail={session!.user.email ?? null}
          meliProfile={meliProfile}
        />
        {!accessToken && (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted-foreground">Todavía no conectaste tu cuenta de Mercado Libre.</p>
            <Button render={<Link href="/login" />} nativeButton={false}>
              Conectar con Mercado Libre
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
