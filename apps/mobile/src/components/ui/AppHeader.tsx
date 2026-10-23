import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { TOUCH_TARGET } from '../../lib/typography';

export interface HeaderIconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * Accessible Icon Button for header actions:
 * - Guarantees minimum 44x44 touch target
 * - Includes 10px hitSlop on all sides
 * - Requires explicit accessibilityLabel
 */
export function HeaderIconButton({
  onPress,
  accessibilityLabel,
  children,
  style,
  disabled = false,
}: HeaderIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
      style={[styles.iconButton, style]}
    >
      {children}
    </TouchableOpacity>
  );
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  backAccessibilityLabel?: string;
}

/**
 * Foundation AppHeader primitive:
 * - Uses status-bar aware top padding via useResponsive
 * - Guaranteed 44x44 icon buttons with required accessibilityLabel
 * - Supports theme tokens, dark mode, and dynamic font scaling with minHeight
 */
export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
  backgroundColor,
  backAccessibilityLabel = 'Go back',
}: AppHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const { s, font, headerPaddingTop, maxFontSizeMultiplier } = useResponsive();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || theme.colors.card,
          paddingTop: headerPaddingTop,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={[styles.content, { paddingHorizontal: s(16), paddingBottom: s(12) }]}>
        {showBack && (
          <HeaderIconButton
            onPress={handleBack}
            accessibilityLabel={backAccessibilityLabel}
            style={{ marginRight: s(8) }}
          >
            <ArrowLeft size={s(20)} color={theme.colors.text} />
          </HeaderIconButton>
        )}

        <View style={[styles.textContainer, { marginRight: rightAction ? s(8) : s(12) }]}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontSize: font(20),
                lineHeight: font(26),
              },
            ]}
            numberOfLines={1}
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
                  fontSize: font(12.5),
                  lineHeight: font(17),
                },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction && (
          <View style={[styles.rightContainer, { marginLeft: s(8) }]}>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  iconButton: {
    minWidth: TOUCH_TARGET ?? 44,
    minHeight: TOUCH_TARGET ?? 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
