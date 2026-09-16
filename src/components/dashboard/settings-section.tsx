import { BadgeCheck, ExternalLink, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const REPUTATION_COLORS: Record<string, string> = {
  "1_red": "bg-rose-500",
  "2_orange": "bg-orange-500",
  "3_yellow": "bg-amber-500",
  "4_light_green": "bg-lime-500",
  "5_green": "bg-emerald-500",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <User className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-bold tracking-tight">Cuenta MeliBoost</h2>
        </div>
        <div className="mt-5">
          <InfoRow label="Nombre" value={accountName ?? "—"} />
          <InfoRow label="Email" value={accountEmail ?? "—"} />
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-[0_0_20px_-12px_rgba(99,102,241,0.7)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-bold tracking-tight">Perfil de Mercado Libre</h2>
        </div>

        {!meliProfile ? (
          <p className="mt-5 text-sm text-muted-foreground">No pudimos traer tu perfil de Mercado Libre.</p>
        ) : (
          <>
            <div className="mt-5">
              <InfoRow label="Nombre" value={`${meliProfile.first_name} ${meliProfile.last_name}`.trim() || "—"} />
              <InfoRow label="Nickname" value={meliProfile.nickname} />
              <InfoRow label="Sitio de Mercado Libre" value={SITE_NAMES[meliProfile.site_id] ?? meliProfile.site_id} />
              <InfoRow label="ID de Usuario MeLi" value={String(meliProfile.id)} />
              {meliProfile.seller_reputation.power_seller_status && (
                <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
                  <span className="text-muted-foreground">Reputación</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {meliProfile.seller_reputation.level_id && (
                      <span
                        className={`h-2 w-2 rounded-full ${REPUTATION_COLORS[meliProfile.seller_reputation.level_id] ?? "bg-muted-foreground"}`}
                      />
                    )}
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    {meliProfile.seller_reputation.power_seller_status.charAt(0).toUpperCase() +
                      meliProfile.seller_reputation.power_seller_status.slice(1)}
                  </span>
                </div>
              )}
            </div>

            <Button
              className="mt-5 w-full"
              render={<a href={meliProfile.permalink} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver cuenta en Mercado Libre
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
