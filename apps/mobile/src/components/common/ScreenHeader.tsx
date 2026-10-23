import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({ title, subtitle, rightAction, showBack }: ScreenHeaderProps) {
  const theme = useTheme();
  const { s, font, headerPaddingTop, maxFontSizeMultiplier } = useResponsive();
  const router = useRouter();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          paddingTop: headerPaddingTop,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.content, { paddingHorizontal: s(16), paddingBottom: s(12) }]}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { marginRight: s(10) }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={s(20)} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: theme.colors.text, fontSize: font(22) }]}
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: theme.colors.sidebarMuted, fontSize: font(12.5) }]}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {rightAction && <View style={[styles.rightAction, { marginLeft: s(12) }]}>{rightAction}</View>}
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
  },
  backButton: {
    padding: 4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
  },
  rightAction: {},
});
