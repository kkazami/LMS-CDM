import { Text } from '../ui/Text';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SurfacePressable as Pressable } from '../motion/SurfacePressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, LayoutDashboard, BarChart2, Megaphone, MoreHorizontal, Trophy } from 'lucide-react-native';
import type { FloatingPillTabBarProps } from './FloatingPillTabBar';
import { useMoreMenu } from './MoreMenuDrawer';
import { useTheme } from '../../hooks/useTheme';
import { useAlertsStore } from '../../stores/alerts-store';
import { useAuthStore } from '../../stores/auth-store';
import { useFloatingTabBarHeight } from '../../lib/design-system';

const icons = {
  dashboard: LayoutDashboard,
  courses: BookOpen,
  analytics: BarChart2,
  grades: Trophy,
  alerts: Megaphone,
  more: MoreHorizontal,
};

export function IbeTabBar({ state, descriptors, emitter, navigateToTab }: FloatingPillTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { barHeight } = useFloatingTabBarHeight();
  const { openMenu, isOpen } = useMoreMenu();
  const unread = useAlertsStore(s => s.unreadCount);
  const fetchUnread = useAlertsStore(s => s.fetchUnreadCount);
  const api = useAuthStore(s => s.api);

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';

  useEffect(() => {
    void fetchUnread(api);
  }, [api, fetchUnread]);

  return (
    <View
      testID="ibe-tab-bar"
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 8,
          paddingTop: 6,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const options = descriptors[route.key].options;
        if (options.hidden || StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') {
          return null;
        }

        const active = route.name === 'more' ? isOpen : !isOpen && state.index === index;
        const color = active ? goldAccent : theme.colors.textSecondary;
        const Icon = icons[route.name as keyof typeof icons] || MoreHorizontal;
        const label = options.title || route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={`${label} tab`}
            accessibilityHint={route.name === 'alerts' ? `${unread} unread notifications` : undefined}
            accessibilityState={{ selected: active }}
            style={[styles.tab, { minHeight: barHeight }]}
            onPress={() => {
              if (route.name === 'more') {
                openMenu();
                return;
              }
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          >
            <View>
              <Icon size={21} color={color} strokeWidth={1.7} />
              {route.name === 'alerts' && unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.label,
                { color },
                { fontSize: width < 360 ? 11 : 12 },
                active && { fontWeight: '700' },
              ]}
            >
              {label}
            </Text>

            <View
              style={{
                width: 18,
                height: 3,
                borderRadius: 2,
                backgroundColor: active ? color : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 990,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: '#B42318',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
});

