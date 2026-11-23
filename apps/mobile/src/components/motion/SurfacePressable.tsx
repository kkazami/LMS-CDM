import React, { forwardRef, useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useMobilePresentation } from '../presentation/MobilePresentation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedSurface = forwardRef<React.ComponentRef<typeof Pressable>, PressableProps>(function AnimatedSurface({ style, onPressIn, onPressOut, ...props }, ref) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable ref={ref} {...props}
    style={[typeof style === 'function' ? style({ pressed }) : style, animatedStyle]}
    onPressIn={event => { setPressed(true); if (!reduced && !props.disabled) scale.value = withTiming(0.98, { duration: 120 }); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); scale.value = withTiming(1, { duration: reduced ? 0 : 120 }); onPressOut?.(event); }} />;
});

export const SurfacePressable = forwardRef<React.ComponentRef<typeof Pressable>, PressableProps>(function SurfacePressable(props, ref) {
  const { isIcsV2 } = useMobilePresentation();
  return isIcsV2 ? <AnimatedSurface ref={ref} {...props} /> : <Pressable ref={ref} {...props} />;
});
