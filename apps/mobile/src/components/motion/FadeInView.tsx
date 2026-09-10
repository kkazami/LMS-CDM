import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";

export function FadeInView({
  children,
  delay = 0,
  duration = 350,
  translateY = 16,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const ty = useSharedValue(reducedMotion ? 0 : translateY);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    ty.value = withDelay(delay, withTiming(0, { duration }));
  }, [delay, duration, reducedMotion, opacity, ty]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}
