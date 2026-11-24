"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface ResponsiveSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel?: string;
  className?: string;
  align?: "left" | "right";
}

export function ResponsiveSelect<T extends string = string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  align = "left",
}: ResponsiveSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        title={ariaLabel ?? selectedOption?.label ?? "Select option"}
        aria-label={ariaLabel ?? selectedOption?.label ?? "Select option"}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] hover:bg-slate-100/80 dark:hover:bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 transition-colors cursor-pointer focus:outline-none focus:border-amber-500"
      >
        <span className="truncate text-left">{selectedOption?.label ?? value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? "rotate-180 text-amber-500" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-1 shadow-lg w-full ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <span className="leading-snug wrap-break-word">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SelectFieldProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

/**
 * Drop-in replacement for native `<select>` that extracts `<option>` children
 * and renders an in-DOM `ResponsiveSelect` so mobile & DevTools viewports never overflow.
 */
export function SelectField({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
  children,
}: SelectFieldProps) {
  const options = useMemo<SelectOption<string>[]>(() => {
    const extracted: SelectOption<string>[] = [];
    const visit = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, (child) => {
        if (!React.isValidElement(child)) return;
        const props = child.props as {
          value?: string | number;
          children?: React.ReactNode;
        };
        if (child.type === "option" || props.value !== undefined) {
          const val = String(props.value ?? "");
          const label =
            typeof props.children === "string" || typeof props.children === "number"
              ? String(props.children)
              : Array.isArray(props.children)
              ? props.children
                  .map((c) =>
                    typeof c === "string" || typeof c === "number" ? String(c) : ""
                  )
                  .join("")
              : val;
          extracted.push({ value: val, label: label.trim() || val });
        } else if (props.children) {
          visit(props.children);
        }
      });
    };
    visit(children);
    return extracted;
  }, [children]);

  // Extract only layout/grid positioning classes (col-span, width, flex) for the outer container
  const layoutClass = useMemo(() => {
    const tokens = className
      .split(/\s+/)
      .filter((t) =>
        /^(w-|min-w-|max-w-|col-span-|sm:col-span-|md:col-span-|lg:col-span-|flex-|sm:w-|md:w-|lg:w-)/.test(
          t
        )
      );
    return tokens.length > 0 ? tokens.join(" ") : "w-full";
  }, [className]);

  return (
    <ResponsiveSelect<string>
      value={value}
      onChange={(nextVal) => onChange({ target: { value: nextVal } })}
      options={options}
      ariaLabel={ariaLabel}
      className={layoutClass}
    />
  );
}
