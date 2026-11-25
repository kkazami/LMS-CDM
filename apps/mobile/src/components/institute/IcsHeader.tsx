import React, { useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ArrowLeft, Bell, ChevronRight, Moon, Search, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../ui/Text';
import { FormModal } from '../ui/FormModal';
import { TextInput } from '../ui/TextInput';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useAlertsStore } from '../../stores/alerts-store';
import { useMoreMenu } from '../navigation/MoreMenuDrawer';
import { API_BASE_URL } from '../../lib/constants';
import { SurfacePressable } from '../motion/SurfacePressable';
import { useMobilePresentation } from '../presentation/MobilePresentation';

export function IcsHeader({ teacher, title, onBack }: { teacher: boolean; title?: string; onBack?: () => void }) {
  const theme = useTheme(), insets = useSafeAreaInsets(), router = useRouter();
  const { toolsReturnFocus } = useMobilePresentation();
  const accountButton = useRef<React.ComponentRef<typeof View>>(null);
  const user = useAuthStore(s => s.user), api = useAuthStore(s => s.api);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const unread = useAlertsStore(s => s.unreadCount), { openMenu } = useMoreMenu();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const role = teacher ? 'teacher' : 'student';
  const classSearch = useQuery({
    queryKey: ['ics-dashboard', user?.id, user?.institute.code],
    queryFn: () => api.mobileDashboard.get(),
    enabled: searchOpen && !!user,
    staleTime: 20000,
  });
  const term = search.trim().toLowerCase();
  const matches = classSearch.data?.courses.filter(course =>
    [course.title, course.courseCode, course.code, course.section].some(value => value?.toLowerCase().includes(term))
  ) ?? [];
  const initials = (user?.name?.trim() || 'ICS').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const avatar = user?.avatarUrl ? new URL(user.avatarUrl, API_BASE_URL).href : null;
  const ink = { color: theme.colors.text }, muted = { color: theme.colors.textSecondary };
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const tint = theme.isDark ? '#382419' : '#FFF0E5';
  function closeSearch() { setSearchOpen(false); setSearch(''); }

  return <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingTop: insets.top }]}>
    <View style={styles.content}>
      {onBack && <SurfacePressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}><ArrowLeft size={17} color={theme.colors.textSecondary} /></SurfacePressable>}
      <View style={styles.context}>
        <Text style={[styles.tag, { backgroundColor: tint, color: accent }]}>ICS</Text>
        <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, ink]}>{title || `${teacher ? 'Teacher' : 'Student'} Dashboard`}</Text>
      </View>
      <SurfacePressable accessibilityRole="button" accessibilityLabel="Search classes" style={styles.icon} onPress={() => setSearchOpen(true)}><Search size={16} color={theme.colors.textSecondary} /></SurfacePressable>
      <SurfacePressable accessibilityRole="button" accessibilityLabel={`Use ${theme.isDark ? 'light' : 'dark'} appearance`} style={styles.icon} onPress={event => { void toggleTheme({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }); }}>{theme.isDark ? <Sun size={16} color={theme.colors.textSecondary} /> : <Moon size={16} color={theme.colors.textSecondary} />}</SurfacePressable>
      <SurfacePressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} unread`} style={styles.icon} onPress={() => router.navigate(`/${role}/(tabs)/alerts`)}>
        <Bell size={16} color={theme.colors.textSecondary} />{unread > 0 && <View style={styles.dot} />}
      </SurfacePressable>
      <SurfacePressable ref={accountButton} accessibilityRole="button" accessibilityLabel="Open account and tools" style={styles.icon} onPress={() => { toolsReturnFocus.current = accountButton.current; openMenu(); }}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: tint }]}><Text style={{ fontSize: 12, fontWeight: '700', color: accent }}>{initials}</Text></View>}
      </SurfacePressable>
    </View>
    <FormModal visible={searchOpen} onClose={closeSearch} title="Search classes">
      <TextInput accessibilityLabel="Class name or code" autoFocus value={search} onChangeText={setSearch} placeholder="Class name or code" placeholderTextColor={theme.colors.textSecondary} style={[styles.input, ink, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]} />
      {matches.map(course => <SurfacePressable key={course.id} accessibilityRole="button" style={[styles.result, { borderColor: theme.colors.border }]} onPress={() => {
        closeSearch();
        router.push(`/${role}/courses/${course.id}`);
      }}>
        <View style={{ flex: 1 }}><Text style={[styles.title, ink]}>{course.title}</Text><Text style={muted}>{course.courseCode || course.code}</Text></View>
        <ChevronRight size={16} color={theme.colors.textSecondary} />
      </SurfacePressable>)}
      {matches.length === 0 && <Text accessibilityLiveRegion="polite" style={muted}>{classSearch.isPending ? 'Loading classes…' : classSearch.isError ? 'Classes could not load. Reopen search to try again.' : term ? 'No matching classes.' : 'No classes to search.'}</Text>}
    </FormModal>
  </View>;
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 1 },
  content: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  context: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6 },
  tag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  title: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  back: { minWidth: 42, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 36, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#B42318' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, marginBottom: 12 },
  result: { minHeight: 48, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
