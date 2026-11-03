import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, LayoutDashboard, BarChart2, Megaphone, MoreHorizontal, Trophy } from 'lucide-react-native';
import type { FloatingPillTabBarProps } from './FloatingPillTabBar';
import { useMoreMenu } from './MoreMenuDrawer';
import { useTheme } from '../../hooks/useTheme';
import { useAlertsStore } from '../../stores/alerts-store';
import { useAuthStore } from '../../stores/auth-store';
import { useFloatingTabBarHeight } from '../../lib/design-system';

const icons = { dashboard: LayoutDashboard, courses: BookOpen, analytics: BarChart2, grades: Trophy, alerts: Megaphone, more: MoreHorizontal };
export function IcsTabBar({ state, descriptors, navigation }: FloatingPillTabBarProps) {
  const theme = useTheme(), insets = useSafeAreaInsets();
  const { barHeight } = useFloatingTabBarHeight();
  const { openMenu, isOpen } = useMoreMenu();
  const unread = useAlertsStore(s => s.unreadCount), fetchUnread = useAlertsStore(s => s.fetchUnreadCount);
  const api = useAuthStore(s => s.api);
  useEffect(() => { void fetchUnread(api); }, [api, fetchUnread]);
  return <View style={[styles.bar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: insets.bottom }]}>
    {state.routes.map((route, index) => {
      const options = descriptors[route.key].options;
      if (options.href === null || StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return null;
      const active = route.name === 'more' ? isOpen : !isOpen && state.index === index;
      const color = active ? theme.isDark ? '#FFAE79' : '#B84400' : theme.colors.textSecondary;
      const Icon = icons[route.name as keyof typeof icons] || MoreHorizontal;
      const label = options.title || route.name;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={`${label} tab`} accessibilityState={{ selected: active }} style={[styles.tab, { minHeight: barHeight }]} onPress={() => {
        if (route.name === 'more') { openMenu(); return; }
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
        <View><Icon size={21} color={color} strokeWidth={1.7} />{route.name === 'alerts' && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}</View>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: 'row' },
  tab: { flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  label: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  badge: { position: 'absolute', top: -6, right: -12, backgroundColor: '#B42318', borderRadius: 8, paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 14 },
});
