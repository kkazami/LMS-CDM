import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Bell,
  Menu,
  BarChart2,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/auth-store';
import { useAlertsStore } from '../../stores/alerts-store';
import { useMoreMenu } from './MoreMenuDrawer';
import {
  getOnPrimaryColor,
  getInstituteGradients,
  useFloatingTabBarHeight,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MARGIN_HORIZONTAL,
} from '../../lib/design-system';

export interface TabRoute {
  key: string;
  name: string;
  params?: any;
}

export interface FloatingPillTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, { options: any }>;
  navigation: any;
  role: 'STUDENT' | 'TEACHER';
}

interface TabItemProps {
  route: TabRoute;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
  role: 'STUDENT' | 'TEACHER';
  primaryColor: string;
  onPrimaryColor: string;
  unreadCount: number;
}

function TabItem({
  route,
  isFocused,
  onPress,
  onLongPress,
  label,
  role,
  primaryColor,
  onPrimaryColor,
  unreadCount,
}: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1 : 0.9,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);

  const renderIcon = (color: string, size: number) => {
    const routeName = route.name;
    if (role === 'TEACHER') {
      switch (routeName) {
        case 'dashboard':
          return <LayoutDashboard size={size} color={color} />;
        case 'courses':
          return <BookOpen size={size} color={color} />;
        case 'analytics':
          return <BarChart2 size={size} color={color} />;
        case 'alerts':
          return <Bell size={size} color={color} />;
        case 'more':
        default:
          return <Menu size={size} color={color} />;
      }
    }

    // Student tabs
    switch (routeName) {
      case 'dashboard':
        return <LayoutDashboard size={size} color={color} />;
      case 'courses':
        return <BookOpen size={size} color={color} />;
      case 'grades':
        return <GraduationCap size={size} color={color} />;
      case 'alerts':
        return <Bell size={size} color={color} />;
      case 'more':
      default:
        return <Menu size={size} color={color} />;
    }
  };

  const isAlerts = route.name === 'alerts';
  const showBadge = isAlerts && unreadCount > 0;

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={`${label} tab`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          isFocused && [styles.activeCircle, { backgroundColor: primaryColor }],
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {renderIcon(isFocused ? onPrimaryColor : 'rgba(255, 255, 255, 0.55)', isFocused ? 22 : 21)}

        {showBadge && (
          <View style={[styles.badge, isFocused && styles.badgeActive]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function FloatingPillTabBar({
  state,
  descriptors,
  navigation,
  role,
}: FloatingPillTabBarProps) {
  const theme = useTheme();
  const api = useAuthStore((s) => s.api);
  const unreadCount = useAlertsStore((s) => s.unreadCount);
  const fetchUnreadCount = useAlertsStore((s) => s.fetchUnreadCount);
  const { openMenu } = useMoreMenu();
  const { bottomLift, totalClearance } = useFloatingTabBarHeight();

  const gradients = getInstituteGradients(theme.colors.primary, theme.isDark);
  const onPrimaryColor = getOnPrimaryColor(theme);

  useEffect(() => {
    fetchUnreadCount(api);
  }, [api, fetchUnreadCount]);

  return (
    <>
      {/* Backing fade strip behind floating pill so scrolled content never bleeds through */}
      <View
        pointerEvents="none"
        style={[
          styles.backingStrip,
          {
            height: totalClearance + 18,
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', theme.colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View
        style={[
          styles.container,
          {
            bottom: bottomLift,
            backgroundColor: gradients.pillBackground,
            borderColor: gradients.borderTint,
          },
        ]}
      >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isMore = route.name === 'more';

        const label =
          options.tabBarLabel !== undefined
            ? (options.tabBarLabel as string)
            : options.title !== undefined
            ? options.title
            : route.name;

        const onPress = () => {
          if (isMore) {
            openMenu();
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            label={label}
            role={role}
            primaryColor={theme.colors.primary}
            onPrimaryColor={onPrimaryColor}
            unreadCount={unreadCount}
          />
        );
      })}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  backingStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 980,
  },
  container: {
    position: 'absolute',
    left: FLOATING_TAB_BAR_MARGIN_HORIZONTAL,
    right: FLOATING_TAB_BAR_MARGIN_HORIZONTAL,
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 990,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeCircle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#181C28',
  },
  badgeActive: {
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
