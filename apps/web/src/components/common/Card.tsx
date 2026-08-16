import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export default function Card({
  title,
  description,
  children,
  rightSlot,
}: CardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-6 shadow-xs transition-colors">
      {(title || description || rightSlot) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5]">{description}</p>
            ) : null}
          </div>
          {rightSlot}
        </div>
      )}

      {children}
    </section>
  );
}