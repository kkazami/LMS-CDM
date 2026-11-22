import { Text } from '../ui/Text';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SurfacePressable as Pressable } from '../motion/SurfacePressable';
import { useMobilePresentation } from '../presentation/MobilePresentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, LayoutDashboard, BarChart2, Megaphone, MoreHorizontal, Trophy } from 'lucide-react-native';
import type { FloatingPillTabBarProps } from './FloatingPillTabBar';
import { useMoreMenu } from './MoreMenuDrawer';
import { useTheme } from '../../hooks/useTheme';
import { useAlertsStore } from '../../stores/alerts-store';
import { useAuthStore } from '../../stores/auth-store';
import { useFloatingTabBarHeight } from '../../lib/design-system';

const icons = { dashboard: LayoutDashboard, courses: BookOpen, analytics: BarChart2, grades: Trophy, alerts: Megaphone, more: MoreHorizontal };
export function IcsTabBar({ state, descriptors, emitter, navigateToTab }: FloatingPillTabBarProps) {
  const { isIcsV2, toolsReturnFocus } = useMobilePresentation();
  const tabRefs = useRef<Record<string, React.ComponentRef<typeof View> | null>>({});
  const theme = useTheme(), insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { barHeight } = useFloatingTabBarHeight();
  const { openMenu, isOpen } = useMoreMenu();
  const unread = useAlertsStore(s => s.unreadCount), fetchUnread = useAlertsStore(s => s.fetchUnreadCount);
  const api = useAuthStore(s => s.api);
  useEffect(() => { void fetchUnread(api); }, [api, fetchUnread]);
  return <View testID={isIcsV2 ? 'ics-tab-bar-v2' : undefined} style={[styles.bar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: insets.bottom }, isIcsV2 && { borderTopWidth: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 8, paddingTop: 6 }]}>
    {state.routes.map((route, index) => {
      const options = descriptors[route.key].options;
      if (options.hidden || StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return null;
      const active = route.name === 'more' ? isOpen : !isOpen && state.index === index;
      const color = active ? theme.isDark ? '#FFAE79' : '#B84400' : theme.colors.textSecondary;
      const Icon = icons[route.name as keyof typeof icons] || MoreHorizontal;
      const label = options.title || route.name;
      return <Pressable key={route.key} ref={node => { tabRefs.current[route.key] = node; }} accessibilityRole="tab" accessibilityLabel={`${label} tab`} accessibilityHint={route.name === 'alerts' ? `${unread} unread notifications` : undefined} accessibilityState={{ selected: active }} style={[styles.tab, { minHeight: barHeight }]} onPress={() => {
        if (route.name === 'more') { if (isIcsV2) toolsReturnFocus.current = tabRefs.current[route.key]; openMenu(); return; }
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigateToTab(route.key);
      }} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}>
        <View><Icon size={21} color={color} strokeWidth={1.7} />{route.name === 'alerts' && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}</View>
        <Text numberOfLines={isIcsV2 ? 1 : undefined} adjustsFontSizeToFit={isIcsV2 || undefined} minimumFontScale={isIcsV2 ? 0.85 : undefined} maxFontSizeMultiplier={isIcsV2 ? 1.2 : undefined}
          style={[styles.label, { color }, isIcsV2 && { fontSize: width < 360 ? 11 : 12 }, isIcsV2 && active && { fontWeight: '700' }]}>{label}</Text>
        {isIcsV2 && <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: active ? color : 'transparent' }} />}
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
