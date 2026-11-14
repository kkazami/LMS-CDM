import { useMemo } from 'react';
import type { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useMobilePresentation } from '../components/presentation/MobilePresentation';

/** Keep incumbent styles as the exact default; share one authenticated surface gate. */
type SurfaceStyle = ViewStyle | TextStyle | ImageStyle;
export function useIcsStyles<T extends Record<string, SurfaceStyle>>(base: T, overrides: Partial<Record<keyof T, SurfaceStyle>>): T {
  const { isIcsV2 } = useMobilePresentation();
  return useMemo(() => isIcsV2 ? Object.fromEntries(Object.entries(base).map(([key, value]) => [
    key, { ...(value as SurfaceStyle), ...overrides[key as keyof T] },
  ])) as T : base, [isIcsV2, base, overrides]);
}
