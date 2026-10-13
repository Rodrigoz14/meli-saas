import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppearancePicker } from "@/components/dashboard/appearance-picker";
import type { MeliUserProfile } from "@/lib/meli-api";

const SITE_NAMES: Record<string, string> = {
  MCO: "Colombia",
  MLA: "Argentina",
  MLM: "México",
  MLB: "Brasil",
  MLC: "Chile",
  MPE: "Perú",
  MLU: "Uruguay",
  MLV: "Venezuela",
  MEC: "Ecuador",
  MPA: "Panamá",
  MCR: "Costa Rica",
  MPT: "Portugal",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

export function SettingsSection({
  accountName,
  accountEmail,
  meliProfile,
}: {
  accountName: string | null;
  accountEmail: string | null;
  meliProfile: MeliUserProfile | null;
}) {
  return (
    <div className="animate-fade-in-up grid gap-4 lg:grid-cols-2">
      <div className="rounded-[22px] border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Cuenta MeliBoost</h2>
        <div className="mt-4">
          <InfoRow label="Nombre" value={accountName ?? "—"} />
          <InfoRow label="Email" value={accountEmail ?? "—"} />
        </div>
      </div>

      {/* Borde de luz giratorio: el contenedor lleva el conic-gradient y la
          capa interior lo tapa, dejando ver solo 1.5px girando. */}
      <div className="relative overflow-hidden rounded-[22px] p-[1.5px]">
        {meliProfile && (
          <div
            className="absolute inset-0 animate-[spin_6s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 230deg, #5470F7 285deg, #34CFE0 330deg, transparent 360deg)",
            }}
            aria-hidden
          />
        )}
        <div className="relative rounded-[21px] border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Perfil de Mercado Libre</h2>
            {meliProfile && (
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-bold text-success">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                Conectado
              </span>
            )}
          </div>

          {!meliProfile ? (
            <p className="mt-4 text-sm text-muted-foreground">No pudimos traer tu perfil de Mercado Libre.</p>
          ) : (
            <>
              <div className="mt-4">
                <InfoRow label="Nickname" value={meliProfile.nickname} />
                <InfoRow
                  label="Sitio de Mercado Libre"
                  value={SITE_NAMES[meliProfile.site_id] ?? meliProfile.site_id}
                />
                <InfoRow label="ID de usuario MeLi" value={String(meliProfile.id)} />
                {meliProfile.seller_reputation.power_seller_status && (
                  <InfoRow
                    label="Reputación"
                    value={
                      meliProfile.seller_reputation.power_seller_status.charAt(0).toUpperCase() +
                      meliProfile.seller_reputation.power_seller_status.slice(1)
                    }
                  />
                )}
              </div>

              <Button
                className="mt-5 w-full justify-between"
                render={<a href={meliProfile.permalink} target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
              >
                <span>Ver cuenta en Mercado Libre</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Apariencia</h2>
        <div className="mt-4">
          <AppearancePicker />
        </div>
      </div>
    </div>
  );
}
