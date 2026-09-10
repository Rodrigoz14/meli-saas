"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Rentabilidad y Costos y gastos son páginas distintas pero comparten los
// mismos datos (ver getRentabilidadData) — cualquier cambio hecho desde
// cualquiera de las dos tiene que invalidar ambas, o la otra se queda con
// datos viejos hasta un refresh manual.
function revalidateDashboards() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/costos-gastos");
}

export async function updateProductCosts(productId: string, cogs: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.product.update({
    where: { id: productId, userId: session.user.id },
    data: { cogs },
  });

  revalidateDashboards();
}

// Carga masiva desde la plantilla CSV — actualiza el COGS de cada producto
// que exista para este usuario con ese meliItemId. Ids que no coincidan con
// ninguna publicación propia se ignoran en silencio (el usuario ve cuántas
// filas sí se aplicaron desde el cliente).
export async function bulkUpdateProductCosts(entries: { meliItemId: string; cogs: number }[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  let updated = 0;
  for (const entry of entries) {
    if (!entry.meliItemId || !Number.isFinite(entry.cogs)) continue;
    const result = await prisma.product.updateMany({
      where: { userId: session.user.id, meliItemId: entry.meliItemId },
      data: { cogs: entry.cogs },
    });
    updated += result.count;
  }

  revalidateDashboards();
  return { updated };
}

// Gastos operativos propios del negocio (nómina, empaque, etc.) — no vienen
// de Mercado Libre, los define el usuario. `isFixed` distingue Fijo
// (mensual, recurrente) de Variable (puntual); `category` agrupa el
// desglose por categoría.
export async function addOperatingCost(label: string, amount: number, category: string, isFixed: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || amount <= 0) return null;

  const entry = await prisma.costEntry.create({
    data: {
      userId: session.user.id,
      label: label.trim(),
      amount,
      isFixed,
      category: category.trim() || "Otros",
    },
  });

  revalidateDashboards();
  return { id: entry.id, label: entry.label, amount: Number(entry.amount), category: entry.category, isFixed: entry.isFixed };
}

export async function bulkAddOperatingCosts(
  entries: { label: string; amount: number; category: string; isFixed: boolean }[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const valid = entries.filter((e) => e.label.trim() && e.amount > 0);
  if (valid.length === 0) return { added: 0 };

  await prisma.costEntry.createMany({
    data: valid.map((e) => ({
      userId: session.user!.id,
      label: e.label.trim(),
      amount: e.amount,
      isFixed: e.isFixed,
      category: e.category.trim() || "Otros",
    })),
  });

  revalidateDashboards();
  return { added: valid.length };
}

export async function deleteOperatingCost(costEntryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.costEntry.deleteMany({
    where: { id: costEntryId, userId: session.user.id },
  });

  revalidateDashboards();
}

// Impuestos/retenciones con nombre propio (IVA, Renta, retención...) — se
// suman entre sí para el % total que se descuenta de las ventas.
export async function addTaxEntry(label: string, percent: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (!label.trim() || percent <= 0) return null;

  const entry = await prisma.taxEntry.create({
    data: { userId: session.user.id, label: label.trim(), percent },
  });

  revalidateDashboards();
  return { id: entry.id, label: entry.label, percent: Number(entry.percent) };
}

export async function deleteTaxEntry(taxEntryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await prisma.taxEntry.deleteMany({
    where: { id: taxEntryId, userId: session.user.id },
  });

  revalidateDashboards();
}
