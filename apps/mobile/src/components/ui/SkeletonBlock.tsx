import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../lib/theme';

export interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Foundation SkeletonBlock primitive:
 * - Animated shimmering pulse for loading states
 * - Uses 100% theme tokens (surfaceAlt in dark mode, border/borderMuted in light mode)
 * - Safe border radius defaults
 */
export function SkeletonBlock({
  width = '100%',
  height = 18,
  borderRadius = radius.md,
  style,
}: SkeletonBlockProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const backgroundColor = theme.isDark
    ? theme.colors.surfaceAlt
    : theme.colors.border;

  return (
    <Animated.View
      accessibilityLabel="Loading content placeholder"
      accessible={true}
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
