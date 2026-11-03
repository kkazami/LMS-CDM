import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { TOUCH_TARGET } from '../../lib/typography';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  actionAccessibilityLabel?: string;
  actionComponent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Foundation SectionTitle primitive:
 * - Clear visual hierarchy for sections
 * - Optional text action or custom action node
 * - Dynamic font scaling and minHeight support
 */
export function SectionTitle({
  title,
  subtitle,
  actionText,
  onActionPress,
  actionAccessibilityLabel,
  actionComponent,
  style,
}: SectionTitleProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textColumn}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: font(16),
              lineHeight: font(22),
            },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {title}
        </Text>
        {Boolean(subtitle) && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: font(12),
                lineHeight: font(16),
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {Boolean(actionText && onActionPress) && (
        <TouchableOpacity
          onPress={onActionPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel || actionText}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: theme.isDark ? theme.colors.primary : theme.colors.text,
                fontSize: font(13),
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {actionText}
          </Text>
        </TouchableOpacity>
      )}

      {Boolean(actionComponent) && (
        <View style={styles.actionComponent}>{actionComponent}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    marginBottom: 8,
    marginTop: 16,
  },
  textColumn: {
    flex: 1,
    minHeight: 22,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
  actionButton: {
    minHeight: TOUCH_TARGET ?? 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  actionText: {
    fontWeight: '600',
  },
  actionComponent: {
    marginLeft: 8,
  },
});
