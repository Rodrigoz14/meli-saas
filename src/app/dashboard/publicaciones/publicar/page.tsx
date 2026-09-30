import { auth } from "@/auth";
import { getRentabilidadData } from "@/lib/dashboard-data";
import { getPublicationProducts } from "@/lib/publications-shared";
import { ConnectMeliPrompt } from "@/components/dashboard/connect-meli-prompt";
import { PublishReview } from "@/components/dashboard/publish-review";

export default async function PublicarPage() {
  const session = await auth();
  const userId = session!.user.id;

  const data = await getRentabilidadData(userId);
  if (!data.connected) return <ConnectMeliPrompt />;

  return <PublishReview products={getPublicationProducts(data)} />;
}
