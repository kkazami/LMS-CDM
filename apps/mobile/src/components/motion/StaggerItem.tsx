import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";

export function StaggerItem({
  children,
  index = 0,
  staggerMs = 50,
  baseDelay = 100,
  duration = 300,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  staggerMs?: number;
  baseDelay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const ty = useSharedValue(reducedMotion ? 0 : 16);

  useEffect(() => {
    if (reducedMotion) { cancelAnimation(opacity); cancelAnimation(ty); opacity.value = 1; ty.value = 0; return; }
    const delay = Math.min(baseDelay + index * staggerMs, 250);
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    ty.value = withDelay(delay, withTiming(0, { duration }));
  }, [index, staggerMs, baseDelay, duration, reducedMotion, opacity, ty]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}
