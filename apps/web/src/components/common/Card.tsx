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
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xs transition-colors">
      {(title || description || rightSlot) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
            ) : null}
          </div>
          {rightSlot}
        </div>
      )}

      {children}
    </section>
  );
}
