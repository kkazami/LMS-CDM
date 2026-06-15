import { icsTheme } from "@/institutes/ics/theme";
import { ibeTheme } from "@/institutes/ibe/theme";
import { iteTheme } from "@/institutes/ite/theme";
import type { InstituteCode, InstituteTheme } from "@/lib/theme";

const THEMES: Record<InstituteCode, InstituteTheme> = {
  ics: icsTheme,
  ibe: ibeTheme,
  ite: iteTheme,
};

export function getInstituteTheme(code: string): InstituteTheme {
  const normalized = code.toLowerCase() as InstituteCode;
  return THEMES[normalized] ?? icsTheme;
}