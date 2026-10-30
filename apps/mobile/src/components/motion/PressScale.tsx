import React from "react";
import { Pressable, type StyleProp, type ViewStyle, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";

export function PressScale({
  children,
  onPress,
  style,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
} & Pick<PressableProps, 'accessibilityLabel' | 'accessibilityHint' | 'disabled'>) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      onPressIn={() => {
        if (reducedMotion || props.disabled) return;
        scale.value = withSpring(0.96, { stiffness: 400, damping: 25 });
      }}
      onPressOut={() => {
        if (reducedMotion) { scale.value = 1; return; }
        scale.value = withSpring(1.0, { stiffness: 300, damping: 20 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
