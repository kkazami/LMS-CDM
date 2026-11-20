import React, { createContext, forwardRef, useContext } from 'react';
import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';
import { useMobilePresentation } from '../presentation/MobilePresentation';
import { useThemeStore } from '../../stores/theme-store';
import { icsTextInk } from '../../lib/mobile-presentation';

export type Text = NativeText;
const InheritedTypography = createContext<{ fontWeight?: string | number; fontFamily?: string }>({});

/** A scoped typeface, never a global Text/defaultProps mutation. */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const { isIcsV2, fontsReady } = useMobilePresentation();
  const dark = useThemeStore(s => s.isDark);
  const flattened = StyleSheet.flatten(style);
  const inherited = useContext(InheritedTypography);
  const weight = flattened?.fontWeight ?? inherited.fontWeight;
  const family = weight === '800' || weight === '900' ? 'Manrope-ExtraBold'
    : weight === '700' || weight === 'bold' ? 'Manrope-Bold'
      : weight === '600' ? 'Manrope-SemiBold' : weight === '500' ? 'Manrope-Medium' : 'Manrope-Regular';
  const explicitFamily = flattened?.fontFamily ?? inherited.fontFamily;
  const typography = fontsReady && !explicitFamily
    ? { fontFamily: family, fontWeight: 'normal' as const } : undefined;
  const ink = icsTextInk(flattened?.color, dark);
  if (!isIcsV2 && !fontsReady) return <NativeText ref={ref} {...props} style={style} />;
  return <InheritedTypography.Provider value={{ fontWeight: weight, fontFamily: explicitFamily }}>
    <NativeText ref={ref} {...props} style={[style, typography, isIcsV2 && ink && { color: ink }]} />
  </InheritedTypography.Provider>;
});
