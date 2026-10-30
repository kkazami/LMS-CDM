import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useAlertsStore } from '../../stores/alerts-store';
import { useMoreMenu } from '../navigation/MoreMenuDrawer';
import { API_BASE_URL } from '../../lib/constants';

export function IcsHeader({ teacher, title }: { teacher: boolean; title?: string }) {
  const theme = useTheme(), insets = useSafeAreaInsets(), router = useRouter();
  const user = useAuthStore(s => s.user), toggleTheme = useThemeStore(s => s.toggleTheme);
  const unread = useAlertsStore(s => s.unreadCount), { openMenu } = useMoreMenu();
  const initials = (user?.name || 'ICS').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const avatar = user?.avatarUrl ? new URL(user.avatarUrl, API_BASE_URL).href : null;
  return <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingTop: insets.top }]}>
    <View style={styles.content}>
      <View style={[styles.tag, { backgroundColor: theme.isDark ? '#3F281A' : '#FFF3EB' }]}><Text style={{ color: theme.isDark ? '#FFAE79' : '#B84400', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>ICS</Text></View>
      <Text numberOfLines={2} style={[styles.title, { color: theme.colors.text }]}>{title || `${teacher ? 'Teacher' : 'Student'} Dashboard`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Use ${theme.isDark ? 'light' : 'dark'} appearance`} style={styles.icon} onPress={() => { void toggleTheme(); }}>{theme.isDark ? <Sun size={18} color={theme.colors.textSecondary} /> : <Moon size={18} color={theme.colors.textSecondary} />}</Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} unread`} style={styles.icon} onPress={() => router.push(`/${teacher ? 'teacher' : 'student'}/(tabs)/alerts` as never)}>
        <Bell size={18} color={theme.colors.textSecondary} />{unread > 0 && <View style={styles.dot} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account and tools" style={styles.icon} onPress={openMenu}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}><Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{initials}</Text></View>}
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { borderBottomWidth: 1 },
  content: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 3 },
  tag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  title: { fontSize: 13, fontWeight: '600', flex: 1, paddingLeft: 3 },
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#B42318' },
});
