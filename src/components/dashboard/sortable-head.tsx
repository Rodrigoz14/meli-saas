import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SortableHead<K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  activeKey: K;
  direction: "asc" | "desc";
  onSort: (key: K) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (direction === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Ordenar por ${label.toLowerCase()}`}
        className={cn(
          "flex items-center gap-1 hover:text-foreground",
          isActive && "font-semibold text-primary",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}
