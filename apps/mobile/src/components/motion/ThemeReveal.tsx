import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Image, Mask, Rect } from 'react-native-svg';
import { captureScreen } from 'react-native-view-shot';
import { registerThemeTransition, useThemeStore } from '../../stores/theme-store';
import { useReducedMotion } from '../../lib/design-system';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Reveal = { uri: string; x: number; y: number; toDark: boolean; width: number; height: number };

/** The previous screen lives only in memory until the circular reveal finishes. */
export function ThemeReveal() {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [shot, setShot] = useState<Reveal | null>(null);
  const radius = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const painted = useRef<(() => void) | null>(null);
  useEffect(() => {
    let mounted = true;
    registerThemeTransition(async origin => {
      if (busy.current) return;
      const toDark = !useThemeStore.getState().isDark;
      const apply = () => useThemeStore.getState().setThemePreference(toDark ? 'dark' : 'light');
      if (reduced || Platform.OS === 'web') { await apply(); return; }
      busy.current = true;
      try {
        const uri = await captureScreen({ format: 'png', result: 'base64' });
        if (!mounted) return;
        const x = Math.max(0, Math.min(width, origin?.x ?? width - 32));
        const y = Math.max(0, Math.min(height, origin?.y ?? 48));
        const end = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
        radius.setValue(toDark ? end : 0);
        const ready = new Promise<void>(resolve => {
          const timer = setTimeout(() => { painted.current = null; resolve(); }, 750);
          painted.current = () => { clearTimeout(timer); painted.current = null; resolve(); };
        });
        setShot({ uri: `data:image/png;base64,${uri}`, x, y, toDark, width, height });
        await ready;
        if (!mounted) return;
        await apply();
        Animated.timing(radius, { toValue: toDark ? 0 : end, duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start(() => {
          if (mounted) setShot(null);
          busy.current = false;
        });
      } catch {
        if (mounted) { setShot(null); await apply(); }
        busy.current = false;
      }
    });
    return () => { mounted = false; registerThemeTransition(null); painted.current?.(); radius.stopAnimation(); busy.current = false; };
  }, [width, height, reduced, radius]);
  useEffect(() => { setShot(null); }, [width, height]);
  return <Modal visible={!!shot} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => { radius.stopAnimation(); setShot(null); busy.current = false; }}>
    {shot && <Svg width={shot.width} height={shot.height} style={StyleSheet.absoluteFill} accessible={false}>
      <Defs><Mask id="theme-reveal" x="0" y="0" width={shot.width} height={shot.height} maskUnits="userSpaceOnUse">
        <Rect width={shot.width} height={shot.height} fill={shot.toDark ? 'black' : 'white'} />
        <AnimatedCircle cx={shot.x} cy={shot.y} r={radius} fill={shot.toDark ? 'white' : 'black'} />
      </Mask></Defs>
      <Image href={{ uri: shot.uri }} onLoad={() => painted.current?.()} x="0" y="0" width={shot.width} height={shot.height} mask="url(#theme-reveal)" preserveAspectRatio="none" />
    </Svg>}
  </Modal>;
}
