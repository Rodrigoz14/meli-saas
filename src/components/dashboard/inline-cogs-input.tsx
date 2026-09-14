"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateProductCosts } from "@/app/dashboard/actions";

// Sin valor por defecto: si el producto no tiene costo asignado todavía, el
// campo arranca vacío (no en "0") para que el usuario lo escriba a mano —
// nunca se asume ni se precarga un costo que no ingresó. Se usa tanto en
// Costos y Gastos como en Rentabilidad (editar ahí mismo evita tener que
// cambiar de pestaña para asignar el costo de un producto).
export function InlineCogsInput({
  productId,
  initialValue,
  currencyId,
  onSaved,
}: {
  productId: string;
  initialValue: number;
  currencyId: string;
  onSaved: (cogs: number) => void;
}) {
  const [value, setValue] = useState(String(initialValue || ""));
  const [isPending, startTransition] = useTransition();

  function save() {
    const cogs = Number(value) || 0;
    startTransition(async () => {
      try {
        await updateProductCosts(productId, cogs);
        toast.success("Costo actualizado");
        onSaved(cogs);
      } catch {
        toast.error("No se pudo guardar el costo");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{currencyId === "COP" ? "$" : currencyId}</span>
      <Input
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        disabled={isPending}
        className={cn(
          "h-8 w-28 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
          !Number(value) && "border-border bg-transparent text-foreground",
        )}
      />
    </div>
  );
}
