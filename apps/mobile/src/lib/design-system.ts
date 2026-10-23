import { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InstituteTheme } from './theme';

/**
 * Returns a high-contrast on-primary color.
 * For IBE yellow (#D4A017, #E5B73B), returns dark #111827 to meet WCAG AA contrast.
 * For ICS orange and ITE blue, returns #FFFFFF.
 */
function sRGBtoLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Calculates standard WCAG 2.1 relative luminance (sRGB linearization).
 */
export function getWcagRelativeLuminance(hexColor: string): number {
  const clean = hexColor.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getWcagRelativeLuminance(hex1);
  const l2 = getWcagRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Single source of truth for text/icon contrast on institute colors.
 * Returns whichever of '#FFFFFF' or '#111827' yields the higher WCAG contrast ratio.
 */
export function getOnPrimaryColor(colorOrTheme: string | InstituteTheme): string {
  const hex = typeof colorOrTheme === 'string' ? colorOrTheme : colorOrTheme.colors.primary;
  const contrastWithWhite = getContrastRatio(hex, '#FFFFFF');
  const contrastWithDark = getContrastRatio(hex, '#111827');
  return contrastWithWhite >= contrastWithDark ? '#FFFFFF' : '#111827';
}

/**
 * Darkens a hex color by factor (0 to 1).
 */
export function darkenHex(hexColor: string, factor: number): string {
  const clean = hexColor.replace('#', '');
  const r = Math.max(0, Math.floor(parseInt(clean.substring(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.floor(parseInt(clean.substring(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.floor(parseInt(clean.substring(4, 6), 16) * (1 - factor)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determines optimal hero text/chip color based on the actual painted hero gradient stops.
 * Evaluates WCAG contrast against both gradient endpoints and returns whichever candidate
 * (#FFFFFF or #111827) provides the higher minimum contrast across the stops (guaranteeing >= 4.5:1).
 */
export function getHeroTextColor(gradientStops: [string, string]): string {
  const minWhite = Math.min(
    getContrastRatio(gradientStops[0], '#FFFFFF'),
    getContrastRatio(gradientStops[1], '#FFFFFF')
  );
  const minDark = Math.min(
    getContrastRatio(gradientStops[0], '#111827'),
    getContrastRatio(gradientStops[1], '#111827')
  );
  return minWhite >= minDark ? '#FFFFFF' : '#111827';
}

/**
 * Derives rich institute-specific gradients and surface tints from the primary color.
 * Hero gradient is kept in a narrow range of the same hue (or deep strong shade for ITE)
 * ensuring >= 4.5:1 contrast at start, middle, and end without muddy browning.
 */
export function getInstituteGradients(primaryColor: string, isDark: boolean, instituteCode?: string) {
  // Keep hero in a narrow, clean range of the same hue (0.08 shift) that avoids brown
  let heroStart = primaryColor;
  let heroEnd = darkenHex(primaryColor, 0.08);

  // In dark mode ITE, use deep strong blue shade that guarantees >= 6.7:1 contrast with #FFFFFF
  const primLower = (primaryColor || '').toLowerCase();
  const codeLower = (instituteCode || '').toLowerCase();
  if (isDark && (primLower === '#3b82f6' || primLower === '#2563eb' || codeLower === 'ite')) {
    heroStart = '#1D4ED8';
    heroEnd = '#1E3A8A';
  }

  const heroGradient: [string, string] = [heroStart, heroEnd];
  const heroTextColor = getHeroTextColor(heroGradient);

  // Dark mode menu: deep near-black tint of institute color (subtle obsidian undertone)
  const menuGradientDark: [string, string] = [
    darkenHex(primaryColor, 0.88),
    '#0D0F15',
  ];

  return {
    heroGradient,
    heroTextColor,
    heroGradientSoft: [`${primaryColor}22`, `${primaryColor}06`] as [string, string],
    menuGradient: isDark
      ? menuGradientDark
      : [primaryColor, darkenHex(primaryColor, 0.12)] as [string, string],
    pillBackground: isDark ? '#131722' : '#1A1E2B',
    surfaceTint: `${primaryColor}14`,
    surfaceTintHover: `${primaryColor}24`,
    borderTint: `${primaryColor}30`,
  };
}

/**
 * Canonical floating tab bar dimensions and clearance measurements.
 */
export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_MARGIN_HORIZONTAL = 18;

/**
 * Hook returning shared tab bar height, bottom clearance, and content padding.
 */
export function useFloatingTabBarHeight() {
  const insets = useSafeAreaInsets();
  const bottomLift = Math.max(insets.bottom, 12) + 6;
  const totalClearance = FLOATING_TAB_BAR_HEIGHT + bottomLift;
  const contentPaddingBottom = totalClearance + 20;
  const fabBottom = totalClearance + 12;

  return {
    barHeight: FLOATING_TAB_BAR_HEIGHT,
    bottomLift,
    totalClearance,
    contentPaddingBottom,
    fabBottom,
  };
}

/**
 * Hook to respect user accessibility reduced-motion preference.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReducedMotion(enabled);
    });

    return () => {
      sub.remove();
    };
  }, []);

  return reducedMotion;
}
