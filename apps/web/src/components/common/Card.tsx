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
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      {(title || description || rightSlot) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-[#2C2727]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            ) : null}
          </div>
          {rightSlot}
        </div>
      )}

      {children}
    </section>
  );
}