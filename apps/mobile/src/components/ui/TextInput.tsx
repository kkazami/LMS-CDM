import React, { forwardRef } from 'react';
import { TextInput as NativeInput, StyleSheet, type TextInputProps } from 'react-native';
import { useMobilePresentation } from '../presentation/MobilePresentation';

export type TextInput = NativeInput;
export const TextInput = forwardRef<NativeInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const { fontsReady } = useMobilePresentation();
  return <NativeInput ref={ref} {...props} style={[style,
    fontsReady && !StyleSheet.flatten(style)?.fontFamily && { fontFamily: 'Manrope-Regular' },
  ]} />;
});
