import type { InstituteTheme } from "@/lib/theme";
import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  theme: InstituteTheme;
};

export default function Badge({ children, theme }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: `${theme.colors.primary}1A`,
        color: theme.colors.primary,
      }}
    >
      {children}
    </span>
  );
}