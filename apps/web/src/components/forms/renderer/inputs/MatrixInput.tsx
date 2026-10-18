"use client";

import type { MatrixConfig } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface MatrixInputProps {
  config?: MatrixConfig;
  value?: Record<string, string> | null;
  onChange: (matrix: Record<string, string>) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function MatrixInput({
  config,
  value = {},
  onChange,
  disabled = false,
  theme,
}: MatrixInputProps) {
  const rows = config?.rows || [];
  const columns = config?.columns || [];
  const matrix = value || {};
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleSelect = (row: string, col: string) => {
    if (disabled) return;
    onChange({
      ...matrix,
      [row]: col,
    });
  };

  return (
    <div className="pt-2 overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse min-w-[360px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-white/10">
            <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase text-[10px]"></th>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="py-2.5 px-3 font-bold text-center text-slate-700 dark:text-slate-300"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
              <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">
                {row}
              </td>
              {columns.map((col, cIdx) => {
                const isSelected = matrix[row] === col;

                return (
                  <td key={cIdx} className="py-3 px-3 text-center">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelect(row, col)}
                      className={`w-5 h-5 rounded-full border mx-auto flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 dark:border-white/30 hover:border-slate-400"
                      }`}
                      style={{
                        backgroundColor: isSelected ? primaryColor : undefined,
                        borderColor: isSelected ? primaryColor : undefined,
                      }}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </button>
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
