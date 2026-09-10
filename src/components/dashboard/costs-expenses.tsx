"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Package, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addOperatingCost,
  deleteOperatingCost,
  updateProductCosts,
  updateTaxWithholding,
} from "@/app/dashboard/actions";

export type CostProduct = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  cogs: number;
};

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

function ProductCostRow({ product, currencyId }: { product: CostProduct; currencyId: string }) {
  const [cogs, setCogs] = useState(String(product.cogs || ""));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateProductCosts(product.productId, Number(cogs) || 0);
        toast.success("Costo actualizado");
      } catch {
        toast.error("No se pudo guardar el costo");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
        {product.thumbnail ? (
          <Image src={product.thumbnail} alt="" width={36} height={36} className="object-cover" unoptimized />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.title}</p>
        <p className="text-xs text-muted-foreground">Precio: {formatMoney(product.price, currencyId)}</p>
      </div>
      <Input
        type="number"
        inputMode="decimal"
        value={cogs}
        onChange={(e) => setCogs(e.target.value)}
        className="w-28"
        placeholder="0"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}

function CostsTab({
  products,
  currencyId,
  totalCogs,
  totalRevenue,
}: {
  products: CostProduct[];
  currencyId: string;
  totalCogs: number;
  totalRevenue: number;
}) {
  const withCost = products.filter((p) => p.cogs > 0).length;
  const pctOfRevenue = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs uppercase text-muted-foreground">Costo total (30d)</p>
          <p className="mt-1 text-lg font-bold text-rose-500">{formatMoney(totalCogs, currencyId)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs uppercase text-muted-foreground">% sobre ventas</p>
          <p className="mt-1 text-lg font-bold">{pctOfRevenue.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-center">
          <p className="text-xs uppercase text-muted-foreground">Con costo asignado</p>
          <p className="mt-1 text-lg font-bold">
            {withCost} / {products.length}
          </p>
        </div>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {products.map((product) => (
          <ProductCostRow key={product.productId} product={product} currencyId={currencyId} />
        ))}
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay publicaciones para asignarles costo todavía.</p>
        )}
      </div>
    </div>
  );
}

function ExpensesTab({
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

  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Estos gastos no vienen de Mercado Libre — los defines tú (nómina, empaque, publicidad externa, etc.).
      </p>

      <div className="space-y-2">
        {costs.map((cost) => (
          <div
            key={cost.id}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
          >
            <span>{cost.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-amber-600 dark:text-amber-400">{formatMoney(cost.amount, currencyId)}</span>
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
        {costs.length === 0 && <p className="text-sm text-muted-foreground">Sin gastos operativos registrados.</p>}
        {costs.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-semibold">
            <span>Total gastos</span>
            <span className="text-amber-500">{formatMoney(total, currencyId)}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Concepto</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nómina, empaque…" />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">Monto</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <Button onClick={handleAdd} disabled={isPending}>
          Agregar
        </Button>
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-4">
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

export function CostsExpensesSection({
  currencyId,
  products,
  totalCogs,
  totalRevenue,
  operatingCosts,
  taxWithholdingPercent,
}: {
  currencyId: string;
  products: CostProduct[];
  totalCogs: number;
  totalRevenue: number;
  operatingCosts: OperatingCost[];
  taxWithholdingPercent: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Costos y gastos</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Costos = lo que te cuesta cada producto. Gastos = lo que gasta tu negocio en general.
      </p>

      <Tabs defaultValue="costos" className="mt-4">
        <TabsList>
          <TabsTrigger value="costos">Costos</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>
        <TabsContent value="costos" className="mt-4">
          <CostsTab products={products} currencyId={currencyId} totalCogs={totalCogs} totalRevenue={totalRevenue} />
        </TabsContent>
        <TabsContent value="gastos" className="mt-4">
          <ExpensesTab currencyId={currencyId} costs={operatingCosts} taxWithholdingPercent={taxWithholdingPercent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
