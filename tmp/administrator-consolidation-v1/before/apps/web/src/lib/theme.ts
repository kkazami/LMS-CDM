export type InstituteCode = "ics" | "ibe" | "ite";

export type InstituteTheme = {
  code: InstituteCode;
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    sidebar: string;
    sidebarMuted: string;
    background: string;
    card: string;
    text: string;
    border: string;
    ring: string;
  };
};

/**
 * Safely converts hex color string to rgba with specified opacity (0.0 to 1.0)
 */
export function withOpacity(color: string, opacity: number): string {
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}