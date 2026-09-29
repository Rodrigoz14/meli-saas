import { auth } from "@/auth";
import { getRentabilidadData } from "@/lib/dashboard-data";
import { getPublicationProducts } from "@/lib/publications-shared";
import { ConnectMeliPrompt } from "@/components/dashboard/connect-meli-prompt";
import { InfographicSetGenerator } from "@/components/dashboard/infographic-set-generator";

export default async function ImagenesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);
  if (!data.connected) return <ConnectMeliPrompt />;

  return <InfographicSetGenerator products={getPublicationProducts(data)} />;
}
