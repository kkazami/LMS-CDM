"use client";

interface SectionHeaderProps {
  title: string;
  description?: string | null;
}

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-6 sm:p-7 space-y-2 shadow-xs">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#8B92A5] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
