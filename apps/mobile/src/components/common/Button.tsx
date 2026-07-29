import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { LucideIcon } from 'lucide-react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const theme = useTheme();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, borderWidth: 1 };
      case 'secondary':
        return { backgroundColor: theme.colors.sidebarMuted, borderColor: theme.colors.sidebarMuted, borderWidth: 1 };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: theme.colors.border, borderWidth: 1 };
      case 'danger':
        return { backgroundColor: '#EF4444', borderColor: '#EF4444', borderWidth: 1 };
      case 'ghost':
        return { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return '#FFFFFF';
      case 'outline':
      case 'ghost':
        return theme.colors.text;
    }
  };

  const containerStyle = [
    styles.container,
    getContainerStyle(),
    disabled && styles.disabledContainer,
    style,
  ];

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon && <Icon color={textColor} size={20} style={styles.icon} />}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 48,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
