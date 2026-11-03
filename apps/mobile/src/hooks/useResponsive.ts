import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFloatingTabBarHeight } from '../lib/design-system';

/**
 * Standard baseline width for mobile design (typical modern phone e.g. iPhone 12/13/14)
 */
const BASELINE_WIDTH = 390;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.10;

/**
 * Shared responsive hook for mobile layouts:
 * - Scales spacing, typography, and dimensions clamped between 0.85x and 1.10x
 * - Provides safe-area insets and ready-to-use header/bottom clearance values
 * - Enforces maxFontSizeMultiplier to prevent OS accessibility text from breaking UI
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { contentPaddingBottom } = useFloatingTabBarHeight();

  // Clamped horizontal scale factor
  const rawScale = width / BASELINE_WIDTH;
  const scale = Math.min(Math.max(rawScale, MIN_SCALE), MAX_SCALE);

  /** Scale a size dimension (padding, margin, width, height, radius) */
  const s = (size: number): number => Math.round(size * scale);

  /** Scale font size */
  const font = (size: number): number => Math.round(size * Math.max(1, scale));

  // Safe area values
  const topInset = insets.top;
  const bottomInset = insets.bottom;

  // Header paddingTop: system status bar inset + small clean gap
  const headerPaddingTop = topInset + 8;

  // Bottom scroll clearance for tab bar + home indicator
  const bottomClearance = contentPaddingBottom;

  return {
    width,
    height,
    scale,
    s,
    font,
    insets,
    topInset,
    bottomInset,
    headerPaddingTop,
    bottomClearance,
    maxFontSizeMultiplier: 2,
    isSmallPhone: width < 375,
    isLargePhone: width >= 414,
    // Pre-calculated target size tokens
    tokens: {
      pageTitle: font(22),
      sectionTitle: font(16),
      body: font(16),
      caption: font(14),
      micro: font(12),
      cardPadding: s(13),
      cardGap: s(10),
      borderRadius: s(14),
      btnHeight: Math.max(48, s(48)),
    },
  };
}
