import { prisma } from "@/lib/prisma";

// Tope diario de infografías generadas con IA de paga (Higgsfield) por
// usuario — protege el presupuesto de un loop/abuso, no el uso normal. Al
// llegar al tope, el generador cae al sistema de respaldo (Satori, sin
// costo) en vez de bloquear al usuario. El set pasó de 5 a 6 piezas (se
// sumó "portada"), el tope sube proporcionalmente para seguir permitiendo
// ~4 sets completos por día.
export const DAILY_INFOGRAPHIC_LIMIT = 24;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getInfographicUsageToday(userId: string): Promise<number> {
  return prisma.generatedImage.count({
    where: { userId, kind: "infographic", createdAt: { gte: startOfTodayUtc() } },
  });
}

export async function hasReachedDailyInfographicLimit(userId: string): Promise<boolean> {
  const used = await getInfographicUsageToday(userId);
  return used >= DAILY_INFOGRAPHIC_LIMIT;
}

export async function recordInfographicGeneration(userId: string, url: string, productId?: string): Promise<void> {
  await prisma.generatedImage.create({
    data: { userId, url, kind: "infographic", productId: productId ?? null },
  });
}
