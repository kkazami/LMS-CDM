import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { radius, spacing } from '../../lib/theme';
import { TOUCH_TARGET } from '../../lib/typography';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Foundation ErrorState primitive:
 * - Dedicated full-screen or section error view
 * - Semantic danger tokens and theme background
 * - Accessible Retry button with minimum 44x44 touch area
 */
export function ErrorState({
  title = 'Unable to Load Data',
  message = 'An unexpected error occurred while loading this screen. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try Again',
  retryAccessibilityLabel = 'Retry loading data',
  style,
}: ErrorStateProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: theme.colors.dangerBg,
            borderRadius: radius.full,
          },
        ]}
      >
        <AlertCircle size={s(36)} color={theme.colors.danger} />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
            fontSize: font(17),
            lineHeight: font(23),
          },
        ]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            color: theme.colors.textSecondary,
            fontSize: font(13.5),
            lineHeight: font(19),
          },
        ]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {message}
      </Text>

      {Boolean(onRetry) && (
        <TouchableOpacity
          onPress={onRetry}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={retryAccessibilityLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          style={[
            styles.retryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: radius.md,
              paddingHorizontal: s(spacing.xl),
            },
          ]}
        >
          <RefreshCw size={s(16)} color="#FFFFFF" style={{ marginRight: s(6) }} />
          <Text
            style={[
              styles.retryText,
              {
                fontSize: font(14),
                color: '#FFFFFF',
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {retryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  iconContainer: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  message: {
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
    minHeight: 38,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET ?? 44,
  },
  retryText: {
    fontWeight: '600',
  },
});
