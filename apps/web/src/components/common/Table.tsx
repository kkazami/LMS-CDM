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
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className={theme ? "" : "border-b border-gray-200 bg-gray-50"}>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-4 py-3 font-medium ${theme ? "" : "text-gray-700"}`}
                style={theme ? { backgroundColor: theme.colors.primary, color: '#ffffff' } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-0">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-gray-700">
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