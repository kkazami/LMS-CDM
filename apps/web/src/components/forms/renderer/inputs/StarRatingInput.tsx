"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingInputProps {
  maxStars?: number;
  value?: number | null;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export default function StarRatingInput({
  maxStars = 5,
  value,
  onChange,
  disabled = false,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);
  const activeRating = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-1.5 pt-2">
      {stars.map((starNum) => {
        const isFilled = starNum <= activeRating;

        return (
          <button
            key={starNum}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(starNum)}
            onMouseLeave={() => !disabled && setHovered(null)}
            onClick={() => !disabled && onChange(starNum)}
            className="p-1 rounded-lg text-slate-300 dark:text-white/20 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                isFilled
                  ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                  : "text-slate-300 dark:text-white/20"
              }`}
            />
          </button>
        );
      })}
      {value && (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-2">
          {value} / {maxStars}
        </span>
      )}
    </div>
  );
}
