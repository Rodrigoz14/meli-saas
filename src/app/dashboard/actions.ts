"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateProductCosts(productId: string, cogs: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.product.update({
    where: { id: productId, userId: session.user.id },
    data: { cogs },
  });

  revalidatePath("/dashboard");
}

// Gastos operativos propios del negocio (nómina, empaque, etc.) — no vienen
// de Mercado Libre, los define el usuario.
export async function addOperatingCost(label: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || amount <= 0) return;

  await prisma.costEntry.create({
    data: { userId: session.user.id, label: label.trim(), amount, isFixed: true },
  });

  revalidatePath("/dashboard");
}

export async function deleteOperatingCost(costEntryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.costEntry.deleteMany({
    where: { id: costEntryId, userId: session.user.id },
  });

  revalidatePath("/dashboard");
}

// % de retención/impuesto sobre las ventas, configurado por el usuario.
export async function updateTaxWithholding(percent: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { taxWithholdingPercent: percent },
  });

  revalidatePath("/dashboard");
}
