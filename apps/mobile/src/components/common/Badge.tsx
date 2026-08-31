import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const theme = useTheme();

  const getStyle = () => {
    if (theme.isDark) {
      switch (variant) {
        case 'success':
          return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399' };
        case 'warning':
          return { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24' };
        case 'danger':
          return { bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171' };
        case 'info':
          return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' };
        case 'primary':
          return { bg: theme.colors.primary + '25', text: theme.colors.primary };
        case 'default':
        default:
          return { bg: 'rgba(156, 163, 175, 0.2)', text: '#D1D5DB' };
      }
    }

    switch (variant) {
      case 'success':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'danger':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'info':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'primary':
        return { bg: theme.colors.primary + '18', text: theme.colors.primary };
      case 'default':
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const colors = getStyle();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={'Badge: ' + label}
      style={[styles.container, { backgroundColor: colors.bg }, style]}
    >
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
