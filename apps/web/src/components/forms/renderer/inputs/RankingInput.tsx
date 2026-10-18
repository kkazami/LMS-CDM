"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import type { RankingConfig } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface RankingInputProps {
  config?: RankingConfig;
  value?: string[] | null;
  onChange: (orderedIds: string[]) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function RankingInput({
  config,
  value,
  onChange,
  disabled = false,
  theme,
}: RankingInputProps) {
  const items = config?.items || [];
  // Use passed value order, or default items order
  const currentOrder = value && value.length === items.length
    ? value
    : items.map((i) => i.id);

  const itemsMap = new Map(items.map((i) => [i.id, i.text]));

  const handleMove = (index: number, direction: "UP" | "DOWN") => {
    if (disabled) return;
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;

    onChange(nextOrder);
  };

  return (
    <div className="space-y-2 pt-2 max-w-md">
      <div className="text-[11px] text-slate-500 pb-1">
        Use arrows to order items from top priority (1) to lowest priority:
      </div>

      {currentOrder.map((id, index) => {
        const text = itemsMap.get(id) || id;

        return (
          <div
            key={id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-xs font-medium text-slate-800 dark:text-white"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                {index + 1}
              </span>
              <span>{text}</span>
            </div>

            {!disabled && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(index, "UP")}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === currentOrder.length - 1}
                  onClick={() => handleMove(index, "DOWN")}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
