import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

import type { InstituteTheme } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  ringColor?: string;
  theme?: InstituteTheme;
}

export function Input({ label, error, ringColor, theme: propTheme, ...props }: InputProps) {
  const hookTheme = useTheme();
  const theme = propTheme || hookTheme;
  const [isFocused, setIsFocused] = useState(false);

  const activeBorder = ringColor || theme.colors.ring;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>}
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={error ?? props.accessibilityHint}
        style={[
          styles.input,
          {
            borderColor: error ? '#EF4444' : isFocused ? activeBorder : theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.isDark ? theme.colors.surfaceAlt : theme.colors.surface,
          },
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text accessibilityRole="alert" style={[styles.error, { color: theme.isDark ? '#FCA5A5' : '#B42318' }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
