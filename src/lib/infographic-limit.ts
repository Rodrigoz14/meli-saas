import { prisma } from "@/lib/prisma";

// Tope diario de infografías generadas con IA de paga (Higgsfield) por
// usuario — protege el presupuesto de un loop/abuso, no el uso normal. Al
// llegar al tope, el generador cae al sistema de respaldo (Satori, sin
// costo) en vez de bloquear al usuario. El set completo pasó de 5 a 13
// piezas, así que el tope sube proporcionalmente (antes permitía ~4 sets/día,
// esto sigue permitiendo esa misma cantidad de sets completos).
export const DAILY_INFOGRAPHIC_LIMIT = 52;

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
