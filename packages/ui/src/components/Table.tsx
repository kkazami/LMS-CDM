import React, { ReactNode } from "react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface TableColumn<T> {
  key: Extract<keyof T, string>;
  header: ReactNode;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface TableThemeColors {
  primary?: string;
  headerBg?: string;
}

export interface TableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: ReactNode;
  themeColors?: TableThemeColors;
  className?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = "No data available",
  themeColors,
  className,
}: TableProps<T>) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400 border-theme text-muted-theme bg-surface">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      {/* Mobile view (<768px): Stacked Cards */}
      <div className="md:hidden flex flex-col gap-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-theme bg-surface overflow-hidden shadow-sm"
          >
            {columns.map((col, colIndex) => {
              const value = col.render ? col.render(row) : (row[col.key] as ReactNode);
              return (
                <div
                  key={`${rowIndex}-${col.key}`}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 min-h-[44px]",
                    colIndex !== columns.length - 1 && "border-b border-slate-100 dark:border-slate-800 border-theme"
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-muted-theme mb-1 sm:mb-0">
                    {col.header}
                  </span>
                  <div className="text-sm font-medium text-slate-900 dark:text-white text-primary-theme">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Desktop view (>=768px): Standard Table */}
      <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 border-theme bg-white dark:bg-slate-900 bg-surface">
        <table className="w-full text-left text-sm">
          <thead
            className="bg-slate-50 dark:bg-slate-800/50 bg-elevated border-b border-slate-200 dark:border-slate-800 border-theme"
            style={themeColors?.headerBg ? { backgroundColor: themeColors.headerBg } : undefined}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={cn(
                    "px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-secondary-theme",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 divide-theme">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
              >
                {columns.map((col) => {
                  const value = col.render ? col.render(row) : (row[col.key] as ReactNode);
                  return (
                    <td
                      key={`${rowIndex}-${String(col.key)}`}
                      className={cn("px-6 py-4 min-h-[44px] text-slate-900 dark:text-white text-primary-theme", col.className)}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
