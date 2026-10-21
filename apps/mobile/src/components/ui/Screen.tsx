import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';

export interface ScreenProps {
  children: React.ReactNode;
  /** When true, renders a ScrollView; otherwise a static View. Defaults to false. */
  scroll?: boolean;
  /** Alias for scroll. When true, renders a ScrollView. */
  scrollable?: boolean;
  /** Optional RefreshControl element passed to the ScrollView. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Style applied to the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the inner content container or ScrollView contentContainerStyle. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * If true, applies status bar safe-area top inset + clean spacing to the root.
   * Useful when screen has no AppHeader.
   */
  withTopInset?: boolean;
  /**
   * If true, applies bottom clearance for the tab bar / home indicator.
   * Defaults to false (tab screens can opt in or apply their own bottom clearance).
   */
  withBottomInset?: boolean;
  /** Custom background color override; defaults to theme.colors.background. */
  backgroundColor?: string;
  /** Maximum content width on tablets / web. Defaults to 720. Set to 0 to disable. */
  maxWidth?: number;
}

/**
 * Foundation Screen primitive:
 * - Uses react-native-safe-area-context insets (never deprecated react-native SafeAreaView)
 * - Supports dark mode via theme tokens
 * - Optional ScrollView with RefreshControl & keyboard handling
 * - Responsive max width container on tablet / web
 */
export function Screen({
  children,
  scroll = false,
  scrollable,
  refreshControl,
  style,
  contentContainerStyle,
  withTopInset = false,
  withBottomInset = false,
  backgroundColor,
  maxWidth = 720,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isScroll = scrollable !== undefined ? scrollable : scroll;
  const { headerPaddingTop, bottomClearance, width } = useResponsive();

  const isWideScreen = maxWidth > 0 && width > maxWidth;
  const resolvedBg = backgroundColor || theme.colors.background;

  const innerStyle: StyleProp<ViewStyle> = [
    styles.inner,
    isWideScreen && { maxWidth, alignSelf: 'center', width: '100%' },
    withBottomInset && { paddingBottom: bottomClearance },
    contentContainerStyle,
  ];

  const rootStyle: StyleProp<ViewStyle> = [
    styles.root,
    {
      backgroundColor: resolvedBg,
      paddingTop: withTopInset ? headerPaddingTop : 0,
    },
    style,
  ];

  if (isScroll) {
    return (
      <View style={rootStyle}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={innerStyle}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={rootStyle}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
