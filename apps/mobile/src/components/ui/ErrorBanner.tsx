import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AlertCircle, RotateCcw, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { radius, spacing } from '../../lib/theme';
import { TOUCH_TARGET } from '../../lib/typography';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
  retryAccessibilityLabel?: string;
  dismissAccessibilityLabel?: string;
}

/**
 * Foundation ErrorBanner primitive:
 * - Inline alert banner for recoverable fetch errors
 * - Uses semantic theme danger tokens (dangerBg, danger, text)
 * - Accessible retry button with min 44x44 touch target & REQUIRED accessibilityLabel
 */
export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Retry',
  style,
  retryAccessibilityLabel = 'Retry operation',
  dismissAccessibilityLabel = 'Dismiss error',
}: ErrorBannerProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.dangerBg,
          borderColor: theme.colors.danger,
          borderRadius: radius.md,
          paddingHorizontal: s(spacing.md),
          paddingVertical: s(spacing.sm),
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        <AlertCircle
          size={s(18)}
          color={theme.colors.danger}
          style={{ marginRight: s(8), marginTop: 2 }}
        />
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.message,
              {
                color: theme.colors.text,
                fontSize: font(13),
                lineHeight: font(18),
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {message}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {Boolean(onRetry) && (
          <TouchableOpacity
            onPress={onRetry}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={retryAccessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            style={[
              styles.retryBtn,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.danger,
                borderRadius: radius.sm,
              },
            ]}
          >
            <RotateCcw size={s(13)} color={theme.colors.danger} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.retryText,
                {
                  color: theme.colors.danger,
                  fontSize: font(12),
                },
              ]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}

        {Boolean(onDismiss) && (
          <TouchableOpacity
            onPress={onDismiss}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={dismissAccessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            style={styles.dismissBtn}
          >
            <X size={s(16)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    minHeight: 48,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  textContainer: {
    flex: 1,
    minHeight: 20,
    justifyContent: 'center',
  },
  message: {
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    minHeight: TOUCH_TARGET ?? 44,
    borderWidth: 1,
  },
  retryText: {
    fontWeight: '600',
  },
  dismissBtn: {
    minWidth: TOUCH_TARGET ?? 44,
    minHeight: TOUCH_TARGET ?? 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
