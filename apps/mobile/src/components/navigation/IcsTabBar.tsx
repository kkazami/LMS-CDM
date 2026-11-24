import { Text } from '../ui/Text';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SurfacePressable as Pressable } from '../motion/SurfacePressable';
import { useMobilePresentation } from '../presentation/MobilePresentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, LayoutDashboard, BarChart2, Megaphone, MoreHorizontal, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { FloatingPillTabBarProps } from './FloatingPillTabBar';
import { useMoreMenu } from './MoreMenuDrawer';
import { useTheme } from '../../hooks/useTheme';
import { useAlertsStore } from '../../stores/alerts-store';
import { useAuthStore } from '../../stores/auth-store';
import { useFloatingTabBarHeight } from '../../lib/design-system';

const icons = { dashboard: LayoutDashboard, courses: BookOpen, analytics: BarChart2, grades: Trophy, alerts: Megaphone, more: MoreHorizontal };
export function IcsTabBar({ state, descriptors, emitter, navigateToTab }: FloatingPillTabBarProps) {
  const tabs: IcsTab[] = state.routes.flatMap((route, index) => {
    const options = descriptors[route.key].options;
    if (options.hidden || StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return [];
    return [{
      name: route.name,
      label: options.title || route.name,
      selected: state.index === index,
      press: () => {
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigateToTab(route.key);
      },
      longPress: () => emitter.emit({ type: 'tabLongPress', target: route.key }),
    }];
  });
  return <IcsNavigation tabs={tabs} />;
}

export function IcsCourseTabBar({ teacher }: { teacher: boolean }) {
  const router = useRouter();
  const role = teacher ? 'teacher' : 'student';
  const destinations = [
    ['dashboard', 'Dashboard'], ['courses', teacher ? 'Classes' : 'Courses'],
    teacher ? ['analytics', 'Analytics'] : ['grades', 'Grades'], ['alerts', 'Alerts'], ['more', 'More'],
  ] as const;
  return <IcsNavigation tabs={destinations.map(([name, label]) => ({
    name, label, selected: name === 'courses',
    press: () => router.navigate(`/${role}/(tabs)/${name}`),
  }))} />;
}

type IcsTab = { name: string; label: string; selected: boolean; press: () => void; longPress?: () => void };

function IcsNavigation({ tabs }: { tabs: IcsTab[] }) {
  const { isIcsV2, toolsReturnFocus } = useMobilePresentation();
  const tabRefs = useRef<Record<string, React.ComponentRef<typeof View> | null>>({});
  const theme = useTheme(), insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { barHeight } = useFloatingTabBarHeight();
  const { openMenu, isOpen } = useMoreMenu();
  const unread = useAlertsStore(s => s.unreadCount), fetchUnread = useAlertsStore(s => s.fetchUnreadCount);
  const api = useAuthStore(s => s.api);
  useEffect(() => { void fetchUnread(api); }, [api, fetchUnread]);
  return <View testID={isIcsV2 ? 'ics-tab-bar-v2' : undefined} style={[styles.bar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: insets.bottom }]}>
    {tabs.map(({ name, label, selected, press, longPress }) => {
      const active = name === 'more' ? isOpen : !isOpen && selected;
      const color = active ? theme.isDark ? '#FFAE79' : '#B84400' : theme.colors.textSecondary;
      const Icon = icons[name as keyof typeof icons] || MoreHorizontal;
      return <Pressable key={name} ref={node => { tabRefs.current[name] = node; }} accessibilityRole="tab" accessibilityLabel={`${label} tab`} accessibilityHint={name === 'alerts' ? `${unread} unread notifications` : undefined} accessibilityState={{ selected: active }} style={[styles.tab, { minHeight: barHeight }]} onPress={() => {
        if (name === 'more') { if (isIcsV2) toolsReturnFocus.current = tabRefs.current[name]; openMenu(); return; }
        press();
      }} onLongPress={longPress}>
        <View><Icon size={21} color={color} strokeWidth={1.7} />{name === 'alerts' && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}</View>
        <Text numberOfLines={isIcsV2 ? 1 : undefined} adjustsFontSizeToFit={isIcsV2 || undefined} minimumFontScale={isIcsV2 ? 0.85 : undefined} maxFontSizeMultiplier={isIcsV2 ? 1.2 : undefined}
          style={[styles.label, { color }, isIcsV2 && { fontSize: width < 360 ? 11 : 12 }, isIcsV2 && active && { fontWeight: '700' }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexShrink: 0, borderTopWidth: 1, flexDirection: 'row' },
  tab: { flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  label: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  badge: { position: 'absolute', top: -6, right: -12, backgroundColor: '#B42318', borderRadius: 8, paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 14 },
});
