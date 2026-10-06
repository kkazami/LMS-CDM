import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * If true, applies status bar safe-area top inset + small gap to the root container.
   * Use this for screens that do not have a dedicated ScreenHeaderContainer.
   */
  withTopInset?: boolean;
  backgroundColor?: string;
}

/**
 * Shared screen wrapper:
 * - Replaces deprecated react-native SafeAreaView (which fails on Android edge-to-edge)
 * - Ensures uniform theme background and safe-area insets
 */
export function ScreenWrapper({
  children,
  style,
  withTopInset = false,
  backgroundColor,
}: ScreenWrapperProps) {
  const theme = useTheme();
  const { headerPaddingTop } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor || theme.colors.background,
          paddingTop: withTopInset ? headerPaddingTop : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ScreenHeaderContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

/**
 * Shared top header container:
 * - Automatically applies `paddingTop: insets.top + 8` so headers never sit under the status bar
 * - Color extends behind the status bar smoothly
 */
export function ScreenHeaderContainer({
  children,
  style,
  backgroundColor,
}: ScreenHeaderContainerProps) {
  const theme = useTheme();
  const { headerPaddingTop } = useResponsive();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: backgroundColor || theme.colors.card,
          borderBottomColor: theme.colors.border,
          paddingTop: headerPaddingTop,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
});
