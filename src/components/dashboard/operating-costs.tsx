"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addOperatingCost,
  deleteOperatingCost,
  updateTaxWithholding,
} from "@/app/dashboard/actions";

export type OperatingCost = { id: string; label: string; amount: number };

function formatMoney(value: number, currencyId: string) {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: currencyId,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

export function OperatingCostsManager({
  currencyId,
  costs,
  taxWithholdingPercent,
}: {
  currencyId: string;
  costs: OperatingCost[];
  taxWithholdingPercent: number;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [taxPercent, setTaxPercent] = useState(String(taxWithholdingPercent || ""));
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const amountValue = Number(amount);
    if (!label.trim() || !amountValue) return;
    startTransition(async () => {
      await addOperatingCost(label, amountValue);
      setLabel("");
      setAmount("");
      toast.success("Gasto operativo agregado");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteOperatingCost(id);
    });
  }

  function handleSaveTax() {
    startTransition(async () => {
      await updateTaxWithholding(Number(taxPercent) || 0);
      toast.success("Retención actualizada");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Gastos operativos y retención</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Estos costos no vienen de Mercado Libre — los defines tú (nómina,
        empaque, retención de impuestos, etc.).
      </p>

      <div className="mt-4 space-y-2">
        {costs.map((cost) => (
          <div
            key={cost.id}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
          >
            <span>{cost.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-amber-600 dark:text-amber-400">
                {formatMoney(cost.amount, currencyId)}
              </span>
              <button
                onClick={() => handleDelete(cost.id)}
                aria-label="Eliminar gasto"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {costs.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin gastos operativos registrados.</p>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Concepto</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nómina, empaque…"
          />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">Monto</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button onClick={handleAdd} disabled={isPending}>
          Agregar
        </Button>
      </div>

      <div className="mt-6 flex items-end gap-2 border-t border-border pt-4">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Retención / impuestos (% sobre ventas)</Label>
          <Input
            type="number"
            value={taxPercent}
            onChange={(e) => setTaxPercent(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button variant="outline" onClick={handleSaveTax} disabled={isPending}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
