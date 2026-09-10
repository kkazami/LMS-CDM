import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
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

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 };
      case 'lg':
        return { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 };
      case 'md':
      default:
        return { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 };
    }
  };

  const colors = getStyle();
  const sizeStyle = getSizeStyle();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={'Badge: ' + label}
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.text, fontSize: sizeStyle.fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
