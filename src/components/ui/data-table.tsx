"use client";

import { cn } from "@/lib/utils";

export interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  rowKey?: keyof T;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  error = null,
  emptyMessage = "Nenhum registro encontrado.",
  emptyAction,
  rowKey = "id" as keyof T,
  className,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("mh-dash-card p-4", className)}>
        <div className="flex flex-col gap-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("mh-dash-card p-4 text-center", className)}>
        <p className="text-negative text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 mh-dash-btn mh-dash-btn--compact text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn("mh-dash-card p-4", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto mh-dash-card", className)}>
      <table className="mh-dash-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "",
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[rowKey])}
              className="cursor-pointer hover:bg-surface-muted transition-colors"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => {
                const value = row[col.key];
                const cellContent = col.render ? col.render(value, row) : String(value ?? "");
                return (
                  <td
                    key={col.key}
                    className={cn(
                      col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "",
                    )}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-10 bg-surface-muted rounded-sm animate-pulse" />
  );
}
