import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export function PressScale({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.96, { stiffness: 400, damping: 25 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1.0, { stiffness: 300, damping: 20 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
