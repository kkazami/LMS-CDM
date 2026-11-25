import React, { useEffect, useRef, useState } from 'react';
import { findNodeHandle, StyleSheet } from 'react-native';
import { Canvas, Group, Image, Skia, type SkImage } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';
import { useReducedMotion } from '../../lib/design-system';
import { registerThemeTransition, useThemeStore } from '../../stores/theme-store';
import type { ThemeRevealProps } from './ThemeReveal';

const CAPTURE_BUDGET_MS = 180;
const DURATION_MS = 480;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

type Reveal = { image: SkImage; toDark: boolean; radius: number; apply: () => void; applied: boolean };

export function ThemeReveal({ contentRef, contentLayout, route }: ThemeRevealProps) {
  // The captured view can extend under Android system bars beyond the reported window.
  const { width, height } = contentLayout ?? { width: 0, height: 0 };
  const reduceMotion = useReducedMotion();
  const isDark = useThemeStore(state => state.isDark);
  const [shot, setShot] = useState<Reveal | null>(null);
  const visible = useRef<Reveal | null>(null);
  const capturing = useRef(false);
  const radius = useSharedValue(0);
  const center = useSharedValue({ x: 0, y: 0 });
  const clip = useDerivedValue(() => Skia.Path.Circle(center.value.x, center.value.y, Math.max(0.01, radius.value)));

  useEffect(() => {
    visible.current = null;
    setShot(null);
    let flushPending: (() => void) | undefined;
    const unregister = registerThemeTransition((origin, apply) => {
      // A second tap commits the queued toggle, then applies the new tap immediately.
      if (flushPending) {
        flushPending();
        return apply();
      }
      if (visible.current || capturing.current || !origin || reduceMotion || !contentRef.current || !width || !height) {
        visible.current = null;
        setShot(null);
        return apply();
      }

      const target = findNodeHandle(contentRef.current);
      if (!target) return apply();
      const x = Math.max(0, Math.min(width, origin.x));
      const y = Math.max(0, Math.min(height, origin.y));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return apply();
      const toDark = !useThemeStore.getState().isDark;
      capturing.current = true;

      return new Promise<void>(resolve => {
        let finished = false;
        const commit = (image: SkImage | null) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          const applyTheme = () => {
            flushPending = undefined;
            resolve(apply());
          };
          if (!image) {
            applyTheme();
            return;
          }

          const farthestCorner = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 1;
          const next: Reveal = {
            image, toDark, radius: farthestCorner, applied: false,
            apply: () => {
              if (visible.current !== next || next.applied) return;
              next.applied = true;
              applyTheme();
            },
          };
          center.value = { x, y };
          radius.value = toDark ? farthestCorner : 0;
          visible.current = next;
          setShot(next);
          flushPending = () => {
            visible.current = null;
            setShot(null);
            applyTheme();
          };
        };
        // Keep the toggle responsive if the device cannot capture the current screen promptly.
        const timeout = setTimeout(() => commit(null), CAPTURE_BUDGET_MS);
        flushPending = () => commit(null);
        const capture = async () => {
          const encoded = await captureRef(target, {
            format: 'jpg', result: 'base64', quality: 0.85,
            width: Math.round(width * 1.5), height: Math.round(height * 1.5),
          });
          if (finished) return null;
          return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(encoded));
        };
        void capture().then(commit, () => commit(null)).finally(() => {
          capturing.current = false;
        });
      });
    });

    return () => {
      unregister();
      flushPending?.();
      visible.current = null;
    };
  }, [center, contentRef, height, width, radius, reduceMotion, route]);

  useEffect(() => {
    if (!shot) return;
    if (shot.toDark !== isDark) {
      if (shot.applied) {
        visible.current = null;
        setShot(null);
        return;
      }
      // Present the outgoing layer before the live app repaints underneath it.
      let paintFrame: number | undefined;
      const frame = requestAnimationFrame(() => { paintFrame = requestAnimationFrame(shot.apply); });
      return () => {
        cancelAnimationFrame(frame);
        if (paintFrame !== undefined) cancelAnimationFrame(paintFrame);
      };
    }
    const finish = () => {
      if (visible.current !== shot) return;
      visible.current = null;
      setShot(null);
    };
    const frame = requestAnimationFrame(() => {
      radius.value = withTiming(shot.toDark ? 0 : shot.radius, { duration: DURATION_MS, easing: ease }, finished => {
        if (finished) scheduleOnRN(finish);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimation(radius);
    };
  }, [isDark, radius, shot]);

  if (reduceMotion) return null;
  return <Canvas style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
    {shot && <Group clip={clip} invertClip={!shot.toDark}>
      <Image image={shot.image} x={0} y={0} width={width} height={height} fit="fill" />
    </Group>}
  </Canvas>;
}
