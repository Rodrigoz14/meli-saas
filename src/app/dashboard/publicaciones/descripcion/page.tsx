import { auth } from "@/auth";
import { getRentabilidadData } from "@/lib/dashboard-data";
import { getPublicationProducts } from "@/lib/publications-shared";
import { ConnectMeliPrompt } from "@/components/dashboard/connect-meli-prompt";
import { DescriptionGenerator } from "@/components/dashboard/description-generator";

export default async function DescripcionPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);
  if (!data.connected) return <ConnectMeliPrompt />;

  return <DescriptionGenerator products={getPublicationProducts(data)} />;
}
