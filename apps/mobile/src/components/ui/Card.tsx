import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { radius, spacing } from '../../lib/theme';

export interface CardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  themedBorder?: boolean;
  variant?: 'default' | 'surfaceAlt' | 'outlined';
  accessibilityLabel?: string;
}

/**
 * Foundation Card primitive:
 * - Backed entirely by institute theme tokens (light & dark)
 * - Safe typography with dynamic minHeights
 * - Accessible when clickable (onPress)
 */
export function Card({
  title,
  subtitle,
  headerRight,
  children,
  onPress,
  style,
  contentStyle,
  themedBorder = false,
  variant = 'default',
  accessibilityLabel,
}: CardProps) {
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier } = useResponsive();

  const getBackgroundColor = () => {
    if (variant === 'surfaceAlt') return theme.colors.surfaceAlt;
    return theme.colors.card;
  };

  const getBorderColor = () => {
    if (themedBorder) return theme.colors.primary;
    return theme.colors.border;
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      {(Boolean(title) || Boolean(subtitle) || Boolean(headerRight)) && (
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              paddingHorizontal: s(spacing.lg),
              paddingVertical: s(spacing.md),
            },
          ]}
        >
          <View style={styles.headerText}>
            {Boolean(title) && (
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
            )}
            {Boolean(subtitle) && (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: font(12.5),
                    lineHeight: font(17),
                  },
                ]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}
      <View
        style={[
          styles.content,
          {
            padding: s(spacing.lg),
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 8,
  },
  content: {
    minHeight: 32,
  },
});
