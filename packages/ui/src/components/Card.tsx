import React, { ReactNode } from "react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  variant?: "default" | "flush";
  className?: string;
}

export default function Card({
  title,
  description,
  rightSlot,
  children,
  variant = "default",
  className,
}: CardProps) {
  const isFlush = variant === "flush";

  return (
    <div
      className={cn(
        "overflow-hidden bg-white dark:bg-slate-900 bg-surface",
        isFlush
          ? "border-y border-slate-200 dark:border-slate-800 border-theme sm:border sm:rounded-xl"
          : "rounded-xl border border-slate-200 dark:border-slate-800 border-theme",
        className
      )}
    >
      {(title || description || rightSlot) && (
        <div
          className={cn(
            "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 border-theme",
            isFlush ? "p-4 sm:p-5 lg:p-6" : "p-4 sm:p-5 lg:p-6"
          )}
        >
          <div className="flex flex-col gap-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-primary-theme">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-secondary-theme">
                {description}
              </p>
            )}
          </div>
          {rightSlot && <div>{rightSlot}</div>}
        </div>
      )}
      <div className={cn(isFlush ? "p-0 sm:p-5 lg:p-6" : "p-4 sm:p-5 lg:p-6")}>
        {children}
      </div>
    </div>
  );
}
