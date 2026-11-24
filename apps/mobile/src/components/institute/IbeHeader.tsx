import { Text } from '../ui/Text';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useAlertsStore } from '../../stores/alerts-store';
import { useMoreMenu } from '../navigation/MoreMenuDrawer';
import { API_BASE_URL } from '../../lib/constants';
import { SurfacePressable } from '../motion/SurfacePressable';
import { isBsbaHrmUser, isBsEntrepUser } from '../../lib/ite-eligibility';

export function IbeHeader({ teacher = false, title }: { teacher?: boolean; title?: string }) {
  const theme = useTheme(), insets = useSafeAreaInsets(), router = useRouter();
  const user = useAuthStore(s => s.user), toggleTheme = useThemeStore(s => s.toggleTheme);
  const unread = useAlertsStore(s => s.unreadCount), { openMenu } = useMoreMenu();
  const initials = (user?.name || 'IBE').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const avatar = user?.avatarUrl ? new URL(user.avatarUrl, API_BASE_URL).href : null;

  const isEntrep = isBsEntrepUser(user);
  const isHrm = isBsbaHrmUser(user);
  const programSub = isEntrep ? 'BS Entrepreneurship' : isHrm ? 'BSBA HRM' : 'Business & Entrepreneurship';

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';
  const goldBg = theme.isDark ? '#3D2A08' : '#FFF9E6';
  const goldBorder = theme.isDark ? '#6B4C0A' : '#F3D580';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <View style={styles.titleCol}>
          <Text style={[styles.brandText, { color: theme.colors.text }]}>CdM LMS</Text>
          <Text style={[styles.subtitleText, { color: goldAccent }]} numberOfLines={1}>
            {title || `IBE · ${programSub}`}
          </Text>
        </View>

        <SurfacePressable
          accessibilityRole="button"
          accessibilityLabel={`Use ${theme.isDark ? 'light' : 'dark'} appearance`}
          style={styles.iconBtn}
          onPress={() => { void toggleTheme(); }}
        >
          {theme.isDark ? <Sun size={20} color={theme.colors.textSecondary} /> : <Moon size={20} color={theme.colors.textSecondary} />}
        </SurfacePressable>

        <SurfacePressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unread} unread`}
          style={styles.iconBtn}
          onPress={() => router.push(`/${teacher ? 'teacher' : 'student'}/(tabs)/alerts` as never)}
        >
          <Bell size={20} color={theme.colors.text} />
          {unread > 0 && <View style={styles.dot} />}
        </SurfacePressable>

        <SurfacePressable
          accessibilityRole="button"
          accessibilityLabel="Open account and tools"
          style={styles.iconBtn}
          onPress={openMenu}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: goldBg, borderColor: goldBorder, borderWidth: 1 }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: goldAccent }}>{initials}</Text>
            </View>
          )}
        </SurfacePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  content: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  brandText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  iconBtn: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
});

