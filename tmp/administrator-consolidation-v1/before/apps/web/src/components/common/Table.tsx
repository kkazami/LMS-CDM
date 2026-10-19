import type { ReactNode } from "react";

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  theme?: import("@/lib/theme").InstituteTheme;
};

export default function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = "No records found.",
  theme,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs">
      <table className="min-w-full text-left text-sm">
        <thead className={theme ? "" : "border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26]"}>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${theme ? "" : "text-slate-700 dark:text-[#8B92A5]"}`}
                style={theme ? { backgroundColor: theme.colors.primary, color: '#ffffff' } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-xs text-slate-700 dark:text-[#F0F2F8]">
                    {column.render
                      ? column.render(row)
                      : String(row[column.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}