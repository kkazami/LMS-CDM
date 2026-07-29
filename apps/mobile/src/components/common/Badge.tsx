import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const theme = useTheme();

  const getStyle = () => {
    switch (variant) {
      case 'success':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'danger':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'info':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'default':
      default:
        return { bg: theme.colors.sidebarMuted, text: '#FFFFFF' };
    }
  };

  const colors = getStyle();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
