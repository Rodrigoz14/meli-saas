import Link from "next/link";
import { auth } from "@/auth";

// Igual que Dashboard, esto trae publicaciones/órdenes reales de Mercado
// Libre y puede tardar más de los 10s por defecto de Vercel.
export const maxDuration = 60;

import { Button } from "@/components/ui/button";
import { ProfitabilityTable } from "@/components/dashboard/profitability-table";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { computePeriodProfit } from "@/lib/profitability";
import { getRentabilidadData } from "@/lib/dashboard-data";

export default async function RentabilidadPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);

  if (!data.connected) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">
          Todavía no conectaste tu cuenta de Mercado Libre
        </h1>
        <p className="max-w-md text-muted-foreground">
          Necesitamos acceso a tus publicaciones para calcular tu rentabilidad real.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Conectar con Mercado Libre
        </Button>
      </div>
    );
  }

  const { rows, errorMessage, taxWithholdingPercent } = data;

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-bold">Rentabilidad</h1>
      <p className="mt-1 text-muted-foreground">
        Margen de contribución por publicación · Meta: <span className="text-emerald-500">&gt;30%</span> ·
        últimos 30 días
      </p>

      {errorMessage && (
        <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </p>
      )}

      {!errorMessage && rows.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No encontramos publicaciones activas en tu cuenta de Mercado Libre.
        </p>
      )}

      {!errorMessage && rows.length > 0 && (
        <>
          {(() => {
            const margins = rows.map((row) =>
              computePeriodProfit({
                ...row,
                unitsSold: row.unitsSold30d,
                revenue: row.revenue30d,
                commission: row.commission30d,
                shipping: row.shipping30d,
                taxWithholdingPercent,
              }),
            );
            const totalNetProfit = margins.reduce((sum, m) => sum + m.netProfit, 0);
            const killers = margins.filter((m) => m.margin >= 30).length;
            const regulares = margins.filter((m) => m.margin >= 15 && m.margin < 30).length;
            const criticos = margins.filter((m) => m.margin < 15).length;

            return (
              <div className="mt-8">
                <SummaryCards
                  totalNetProfit={totalNetProfit}
                  currencyId={rows[0].currencyId}
                  killers={killers}
                  regulares={regulares}
                  criticos={criticos}
                  withCost={rows.filter((row) => row.cogs > 0).length}
                  totalProducts={rows.length}
                />
              </div>
            );
          })()}

          <div className="mt-8">
            <ProfitabilityTable rows={rows} taxWithholdingPercent={taxWithholdingPercent} />
          </div>
        </>
      )}
    </div>
  );
}
