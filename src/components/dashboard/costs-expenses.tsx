"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Package,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BillingSummary } from "@/lib/meli-api";
import {
  addOperatingCost,
  addTaxEntry,
  bulkAddOperatingCosts,
  bulkUpdateProductCosts,
  deleteOperatingCost,
  deleteTaxEntry,
  updateOperatingCost,
  updateProductCosts,
} from "@/app/dashboard/actions";

export type CostProduct = {
  productId: string;
  meliItemId: string | null;
  title: string;
  thumbnail: string;
  price: number;
  cogs: number;
};

export type OperatingCost = {
  id: string;
  label: string;
  amount: number;
  category: string;
  isFixed: boolean;
  source?: "ml";
};
export type TaxEntryItem = { id: string; label: string; percent: number };

const CATEGORY_OPTIONS = ["Nómina", "Empaque", "Publicidad", "Servicios", "Otros"];

const PROGRESS_BAR_CLASS =
  "rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_14px_2px_rgba(139,92,246,0.55)]";

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

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BillingSummaryCard({ summary, currencyId }: { summary: BillingSummary; currencyId: string }) {
  const totalCharges = summary.charges.reduce((sum, c) => sum + c.amount, 0);
  const totalBonuses = summary.bonuses.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Factura Real de Mercado Libre</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          Período {formatDate(summary.periodFrom)} – {formatDate(summary.periodTo)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Factura oficial y cerrada de tu cuenta de Mercado Libre — incluye cargos que la rentabilidad
        calculada por orden no captura (publicidad, asesoría comercial, envíos Full, devoluciones).
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-rose-500">Cargos ({formatMoney(totalCharges, currencyId)})</p>
          <div className="mt-2 space-y-1.5">
            {summary.charges.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="shrink-0">{formatMoney(c.amount, currencyId)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-500">
            Bonificaciones ({formatMoney(totalBonuses, currencyId)})
          </p>
          <div className="mt-2 space-y-1.5">
            {summary.bonuses.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin bonificaciones.</p>
            )}
            {summary.bonuses.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="shrink-0 text-emerald-500">{formatMoney(c.amount, currencyId)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-semibold">
        <span>Total facturado</span>
        <span>{formatMoney(summary.totalAmount, currencyId)}</span>
      </div>
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function InlineCogsInput({
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

function CostsTab({ products, currencyId }: { products: CostProduct[]; currencyId: string }) {
  const router = useRouter();
  const [prevProducts, setPrevProducts] = useState(products);
  const [localProducts, setLocalProducts] = useState(products);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "con" | "sin">("todos");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sincroniza el estado local (editado de forma optimista) cuando el
  // servidor manda props nuevas de verdad — sin useEffect, siguiendo el
  // patrón recomendado por React para "ajustar estado durante el render".
  if (products !== prevProducts) {
    setPrevProducts(products);
    setLocalProducts(products);
  }

  const withCost = localProducts.filter((p) => p.cogs > 0).length;
  const withoutCost = localProducts.length - withCost;
  const progress = localProducts.length > 0 ? Math.round((withCost / localProducts.length) * 100) : 0;

  const filtered = useMemo(() => {
    return localProducts.filter((p) => {
      if (filter === "con" && p.cogs <= 0) return false;
      if (filter === "sin" && p.cogs > 0) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.meliItemId ?? "").includes(search)) {
        return false;
      }
      return true;
    });
  }, [localProducts, search, filter]);

  function handleDownloadTemplate() {
    const rows = [
      ["ID Mercado Libre", "Producto", "COGS"],
      ...localProducts.map((p) => [p.meliItemId ?? "", p.title, String(p.cogs || "")]),
    ];
    downloadCsv("plantilla-cogs.csv", rows);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecciona un archivo CSV primero");
      return;
    }
    startTransition(async () => {
      try {
        const text = await file.text();
        const [, ...dataRows] = parseCsv(text);
        const entries = dataRows
          .map((row) => ({ meliItemId: row[0], cogs: Number(row[2]) }))
          .filter((e) => e.meliItemId && Number.isFinite(e.cogs));
        const { updated } = await bulkUpdateProductCosts(entries);
        toast.success(`${updated} costo(s) actualizados`);
        setLocalProducts((prev) =>
          prev.map((p) => {
            const match = entries.find((e) => e.meliItemId === p.meliItemId);
            return match ? { ...p, cogs: match.cogs } : p;
          }),
        );
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch {
        toast.error("No pudimos leer ese archivo — revisa que sea el CSV de la plantilla");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Progreso de Costos</p>
                <p className="text-xs text-muted-foreground">Productos con COGS asignado</p>
              </div>
            </div>
            <p className="text-xl font-bold">{progress}%</p>
          </div>
          <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-3.5", PROGRESS_BAR_CLASS)} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-emerald-500">{withCost} con costo</span>
            <span className="text-rose-500">{withoutCost} sin costo</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-sm">Total Productos</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{localProducts.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="h-4 w-4" /> Carga Masiva de Costos
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Descarga la plantilla con tus productos, completa la columna COGS y súbela.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-3.5 w-3.5" /> Descargar Plantilla
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="cogs-file" />
          <label
            htmlFor="cogs-file"
            className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {fileName ?? "Ningún archivo seleccionado"}
          </label>
          <Button type="button" size="sm" onClick={handleUpload} disabled={isPending || !fileName}>
            <Upload className="mr-2 h-3.5 w-3.5" /> {isPending ? "Subiendo…" : "Subir COGS"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título o ID..."
          className="max-w-xs"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos ({localProducts.length})</option>
          <option value="con">Con costo ({withCost})</option>
          <option value="sin">Sin costo ({withoutCost})</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">COGS (Costo)</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.productId} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                      {product.thumbnail ? (
                        <Image src={product.thumbnail} alt="" width={32} height={32} className="object-cover" unoptimized />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="max-w-[220px] truncate">{product.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{product.meliItemId ?? "-"}</td>
                <td className="px-3 py-2">
                  <InlineCogsInput
                    productId={product.productId}
                    initialValue={product.cogs}
                    currencyId={currencyId}
                    onSaved={(cogs) =>
                      setLocalProducts((prev) =>
                        prev.map((p) => (p.productId === product.productId ? { ...p, cogs } : p)),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {product.cogs > 0 ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="mx-auto h-4 w-4 text-rose-500" />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Importante:</span> el COGS que ingreses aquí se usa en{" "}
        <span className="font-medium text-foreground">Rentabilidad</span> para calcular tu margen real.
      </p>
    </div>
  );
}

function ExpensesTab({
  currencyId,
  costs,
  taxEntries,
  billingSummary,
}: {
  currencyId: string;
  costs: OperatingCost[];
  taxEntries: TaxEntryItem[];
  billingSummary: BillingSummary | null;
}) {
  const router = useRouter();
  const [prevCosts, setPrevCosts] = useState(costs);
  const [localCosts, setLocalCosts] = useState(costs);
  const [prevTaxEntries, setPrevTaxEntries] = useState(taxEntries);
  const [localTaxEntries, setLocalTaxEntries] = useState(taxEntries);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [isFixed, setIsFixed] = useState(true);
  const [taxLabel, setTaxLabel] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("Otros");
  const [editIsFixed, setEditIsFixed] = useState(true);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mismo patrón que CostsTab: re-sincroniza con props nuevas del servidor
  // sin pasar por useEffect (evita el cascading-render que marca el linter).
  if (costs !== prevCosts) {
    setPrevCosts(costs);
    setLocalCosts(costs);
  }
  if (taxEntries !== prevTaxEntries) {
    setPrevTaxEntries(taxEntries);
    setLocalTaxEntries(taxEntries);
  }

  const totalFixed = localCosts.filter((c) => c.isFixed).reduce((sum, c) => sum + c.amount, 0);
  const totalVariable = localCosts.filter((c) => !c.isFixed).reduce((sum, c) => sum + c.amount, 0);
  const total = totalFixed + totalVariable;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of localCosts) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [localCosts]);

  // Actualización optimista: el cambio se ve al instante en la UI sin esperar
  // el refetch completo de la página (que trae datos en vivo de Mercado
  // Libre y puede tardar 15-20s) — la persistencia real ocurre en paralelo.
  function handleAdd() {
    const amountValue = Number(amount);
    if (!label.trim() || !amountValue) return;
    const labelValue = label.trim();
    setLabel("");
    setAmount("");
    startTransition(async () => {
      const entry = await addOperatingCost(labelValue, amountValue, category, isFixed);
      if (entry) {
        setLocalCosts((prev) => [...prev, entry]);
        toast.success("Gasto agregado");
      } else {
        toast.error("No se pudo agregar el gasto");
      }
    });
  }

  function handleDelete(id: string) {
    setLocalCosts((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteOperatingCost(id);
    });
  }

  function startEdit(cost: OperatingCost) {
    setEditingId(cost.id);
    setEditLabel(cost.label);
    setEditAmount(String(cost.amount));
    setEditCategory(cost.category);
    setEditIsFixed(cost.isFixed);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id: string) {
    const amountValue = Number(editAmount);
    if (!editLabel.trim() || !amountValue) return;
    const labelValue = editLabel.trim();
    const categoryValue = editCategory.trim() || "Otros";
    setLocalCosts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, label: labelValue, amount: amountValue, category: categoryValue, isFixed: editIsFixed } : c,
      ),
    );
    setEditingId(null);
    startTransition(async () => {
      const updated = await updateOperatingCost(id, labelValue, amountValue, categoryValue, editIsFixed);
      if (updated) {
        toast.success("Gasto actualizado");
      } else {
        toast.error("No se pudo actualizar el gasto");
      }
    });
  }

  function handleAddTax() {
    const percentValue = Number(taxPercent);
    if (!taxLabel.trim() || !percentValue) return;
    const labelValue = taxLabel.trim();
    setTaxLabel("");
    setTaxPercent("");
    startTransition(async () => {
      const entry = await addTaxEntry(labelValue, percentValue);
      if (entry) {
        setLocalTaxEntries((prev) => [...prev, entry]);
        toast.success("Impuesto agregado");
      } else {
        toast.error("No se pudo agregar el impuesto");
      }
    });
  }

  function handleDeleteTax(id: string) {
    setLocalTaxEntries((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteTaxEntry(id);
    });
  }

  function handleDownloadTemplate() {
    downloadCsv("plantilla-gastos.csv", [["Concepto", "Monto", "Categoria", "Tipo"]]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecciona un archivo CSV primero");
      return;
    }
    startTransition(async () => {
      try {
        const text = await file.text();
        const [, ...dataRows] = parseCsv(text);
        const entries = dataRows
          .map((row) => ({
            label: row[0] ?? "",
            amount: Number(row[1]),
            category: row[2] || "Otros",
            isFixed: (row[3] ?? "").toLowerCase().startsWith("fij"),
          }))
          .filter((e) => e.label && Number.isFinite(e.amount) && e.amount > 0);
        const { added } = await bulkAddOperatingCosts(entries);
        toast.success(`${added} gasto(s) agregados`);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch {
        toast.error("No pudimos leer ese archivo — revisa que sea el CSV de la plantilla");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-xs text-muted-foreground">Gastos Fijos (mes)</p>
          <p className="mt-1 text-xl font-bold text-rose-500">{formatMoney(totalFixed, currencyId)}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-muted-foreground">Gastos Variables</p>
          <p className="mt-1 text-xl font-bold text-amber-500">{formatMoney(totalVariable, currencyId)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Costos</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(total, currencyId)}</p>
        </div>
      </div>

      {billingSummary && <BillingSummaryCard summary={billingSummary} currencyId={currencyId} />}

      {byCategory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Distribución por Categoría</p>
          <div className="mt-4 space-y-4">
            {byCategory.map(([cat, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cat}</span>
                    <span>
                      {formatMoney(amt, currencyId)}{" "}
                      <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-3.5", PROGRESS_BAR_CLASS)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Registrar Gasto</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-xs">Concepto</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nómina, empaque…" />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Monto</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs">Categoría</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs">Tipo</Label>
            <select
              value={isFixed ? "fijo" : "variable"}
              onChange={(e) => setIsFixed(e.target.value === "fijo")}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="fijo">Fijo (mensual)</option>
              <option value="variable">Variable</option>
            </select>
          </div>
          <Button onClick={handleAdd} disabled={isPending}>
            Agregar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="h-4 w-4" /> Carga Masiva
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-3.5 w-3.5" /> Descargar Plantilla
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="gastos-file" />
          <label
            htmlFor="gastos-file"
            className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {fileName ?? "Ningún archivo seleccionado"}
          </label>
          <Button type="button" size="sm" onClick={handleUpload} disabled={isPending || !fileName}>
            <Upload className="mr-2 h-3.5 w-3.5" /> Subir
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Impuestos (% sobre ventas)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Registra impuestos como un porcentaje aplicado sobre tus ventas reales. Se muestran en Rentabilidad como
          deducción.
        </p>
        <div className="mt-3 space-y-2">
          {localTaxEntries.map((tax) => (
            <div key={tax.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
              <span>{tax.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-amber-600 dark:text-amber-400">{tax.percent}%</span>
                <button onClick={() => handleDeleteTax(tax.id)} aria-label="Eliminar impuesto" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {localTaxEntries.length === 0 && <p className="text-sm text-muted-foreground">No hay impuestos registrados.</p>}
        </div>
        {currencyId === "COP" && (
          <button
            type="button"
            onClick={() => {
              setTaxLabel("Retención estimada (Colombia)");
              setTaxPercent("0.57");
            }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            + Sugerir retención estándar Colombia (~0.57% — ReteFuente/ReteICA, revisa antes de agregar)
          </button>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-xs">Concepto (ej: IVA, Renta)</Label>
            <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="IVA, Renta…" />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Porcentaje (%)</Label>
            <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} placeholder="0" />
          </div>
          <Button onClick={handleAddTax} disabled={isPending}>
            Agregar Impuesto
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Gastos Registrados ({localCosts.length})</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3">Categoría</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3 text-right">Monto</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {localCosts.map((cost) => {
                if (editingId === cost.id) {
                  return (
                    <tr key={cost.id} className="border-b border-border/60 last:border-0 bg-muted/30">
                      <td className="py-2 pr-3">
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8" />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={editIsFixed ? "fijo" : "variable"}
                          onChange={(e) => setEditIsFixed(e.target.value === "fijo")}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="fijo">Fijo (mensual)</option>
                          <option value="variable">Variable</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveEdit(cost.id)} aria-label="Guardar gasto" className="text-emerald-500 hover:text-emerald-600">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEdit} aria-label="Cancelar edición" className="text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={cost.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {cost.label}
                        {cost.source === "ml" && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                            Automático (ML)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{cost.category}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          cost.isFixed ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500",
                        )}
                      >
                        {cost.isFixed ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Fijo/mes
                          </span>
                        ) : (
                          "Variable"
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-amber-600 dark:text-amber-400">
                      {formatMoney(cost.amount, currencyId)}
                    </td>
                    <td className="py-2 text-right">
                      {cost.source !== "ml" && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(cost)} aria-label="Editar gasto" className="text-muted-foreground hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(cost.id)} aria-label="Eliminar gasto" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {localCosts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Sin gastos operativos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CostsExpensesSection({
  currencyId,
  products,
  operatingCosts,
  taxEntries,
  billingSummary,
}: {
  currencyId: string;
  products: CostProduct[];
  operatingCosts: OperatingCost[];
  taxEntries: TaxEntryItem[];
  billingSummary: BillingSummary | null;
}) {
  return (
    <Tabs defaultValue="gastos">
      <TabsList>
        <TabsTrigger value="gastos">Gastos Operativos</TabsTrigger>
        <TabsTrigger value="costos">Costos de Producto (COGS)</TabsTrigger>
        <TabsTrigger value="calculadora" disabled>
          <Clock className="mr-1.5 h-3.5 w-3.5" /> Calculadora
        </TabsTrigger>
      </TabsList>
      <TabsContent value="gastos" className="mt-6">
        <ExpensesTab
          currencyId={currencyId}
          costs={operatingCosts}
          taxEntries={taxEntries}
          billingSummary={billingSummary}
        />
      </TabsContent>
      <TabsContent value="costos" className="mt-6">
        <CostsTab products={products} currencyId={currencyId} />
      </TabsContent>
      <TabsContent value="calculadora" className="mt-6">
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Calculadora de precios — próximamente.
        </div>
      </TabsContent>
    </Tabs>
  );
}
