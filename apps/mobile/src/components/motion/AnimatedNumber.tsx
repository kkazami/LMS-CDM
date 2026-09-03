import React, { useEffect } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";

export function AnimatedNumber({
  value,
  duration = 800,
  style,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
}) {
  const reducedMotion = useReducedMotion();
  const numValue = useSharedValue(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      numValue.value = value;
      return;
    }
    numValue.value = withTiming(value, { duration });
  }, [value, duration, reducedMotion, numValue]);

  return (
    <Text style={style}>
      {prefix}
      {value}
      {suffix}
    </Text>
  );
}
