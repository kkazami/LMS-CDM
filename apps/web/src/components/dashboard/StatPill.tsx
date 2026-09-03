import type { LucideIcon } from "lucide-react";

interface StatPillProps {
  icon: LucideIcon;
  label: string;
  color: string;
}

export function StatPill({ icon: Icon, label, color }: StatPillProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: `${color}14`,
        border: `1px solid ${color}24`,
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="text-xs font-semibold font-mono tabular-nums" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
