import { auth } from "@/auth";
import { getRentabilidadData } from "@/lib/dashboard-data";
import { getPublicationProducts } from "@/lib/publications-shared";
import { ConnectMeliPrompt } from "@/components/dashboard/connect-meli-prompt";
import { SeoOptimizer } from "@/components/dashboard/seo-optimizer";

export default async function SeoOptimizerPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);
  if (!data.connected) return <ConnectMeliPrompt />;

  return <SeoOptimizer products={getPublicationProducts(data)} siteId={data.siteId} />;
}
