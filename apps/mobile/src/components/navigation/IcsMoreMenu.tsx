import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Archive, BarChart2, CheckSquare, ChevronRight, Code2, FlaskConical, Layers, LogOut, MessageSquare, Moon, Network, Sun, Trophy, UserRound, X } from 'lucide-react-native';
import type { MoreMenuContextType } from './MoreMenuDrawer';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../lib/design-system';
import { ProfileEditModal } from '../profile/ProfileEditModal';

export function IcsMoreMenu({ children, role, context: Context }: { children: React.ReactNode; role: 'STUDENT' | 'TEACHER'; context: React.Context<MoreMenuContextType> }) {
  const [isOpen, setOpen] = useState(false), [profile, setProfile] = useState(false);
  const theme = useTheme(), router = useRouter(), insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const user = useAuthStore(s => s.user), logout = useAuthStore(s => s.logout);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const teacher = role === 'TEACHER';
  const base = teacher ? '/teacher' : '/student';
  const initials = (user?.name || 'ICS').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const items = teacher ? [
    { icon: Code2, title: 'CodeLab', description: 'Coding practice', route: `${base}/codelab` },
    { icon: BarChart2, title: 'CodeLab Analytics', description: 'Submissions and coding progress', route: `${base}/codelab?view=instructor` },
    { icon: MessageSquare, title: 'Knowledge Exchange', description: 'Questions & discussions', route: `${base}/knowledge-exchange` },
    { icon: Archive, title: 'Archived Classes', description: 'Review previous classes', route: `${base}/tools?tool=archives` },
    { icon: Network, title: 'Organizational Chart', description: 'Program faculty & classes', route: `${base}/tools?tool=organization` },
    { icon: BarChart2, title: 'Student Analytics', description: 'Class progress and performance', route: `${base}/(tabs)/analytics` },
    { icon: FlaskConical, title: 'Practical Labs', description: 'Assignments, evidence & feedback', route: `${base}/practical-labs` },
    { icon: Trophy, title: 'Leaderboard Manager', description: 'Manage seasons and rankings', route: `${base}/tools?tool=seasons` },
  ] : [
    { icon: Code2, title: 'CodeLab', description: 'Interactive coding labs', route: `${base}/codelab` },
    { icon: MessageSquare, title: 'Knowledge Exchange', description: 'Questions & discussions', route: `${base}/knowledge-exchange` },
    { icon: FlaskConical, title: 'Practical Labs', description: 'Practice with your courses', route: `${base}/practical-labs` },
    { icon: Layers, title: 'Flashcards', description: 'Study decks', route: `${base}/flashcards` },
    { icon: CheckSquare, title: 'Study tasks', description: 'Your task list', route: `${base}/tasks` },
    { icon: Trophy, title: 'Leaderboards', description: 'Top rankings', route: `${base}/leaderboard` },
    { icon: Trophy, title: 'Achievements', description: 'Your learning milestones', route: `${base}/achievements` },
  ];
  function navigate(route: string) { setOpen(false); router.push(route as never); }
  return <Context.Provider value={{ isOpen, openMenu: () => setOpen(true), closeMenu: () => setOpen(false), toggleMenu: () => setOpen(value => !value) }}>
    {children}
    <Modal visible={isOpen} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close tools menu" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height - insets.top - 24, backgroundColor: theme.colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.header, { borderColor: theme.colors.border }]}>
            <Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.text }]}>{teacher ? 'Instructor tools' : 'Student tools'}</Text>
            <View style={[styles.institute, { backgroundColor: theme.colors.primary }]}><Text style={styles.instituteText}>ICS</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close tools menu" onPress={() => setOpen(false)} style={[styles.iconButton, { marginLeft: 'auto' }]}><X size={21} color={theme.colors.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
            <View style={[styles.profile, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}><Text style={styles.avatarText}>{initials}</Text></View>
              <View style={{ flex: 1, gap: 4 }}><Text style={[styles.label, { color: theme.colors.text }]}>{user?.name}</Text><Text style={[styles.description, { color: theme.colors.textSecondary }]}>{user?.role}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" style={styles.iconButton} onPress={() => { setOpen(false); setTimeout(() => setProfile(true), 350); }}><UserRound size={19} color={theme.colors.textSecondary} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Use ${theme.isDark ? 'light' : 'dark'} appearance`} style={styles.iconButton} onPress={() => { void toggleTheme(); }}>{theme.isDark ? <Sun size={19} color={theme.colors.textSecondary} /> : <Moon size={19} color={theme.colors.textSecondary} />}</Pressable>
            </View>
            {items.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => navigate(item.route)} style={({ pressed }) => [styles.item, { borderColor: theme.colors.border, backgroundColor: pressed || index === 0 ? theme.colors.cardSecondary : theme.colors.card }]}>
              <item.icon size={19} color={index === 0 ? theme.isDark ? '#FFAE79' : '#B84400' : theme.colors.text} />
              <View style={{ flex: 1, gap: 4 }}><Text style={[styles.label, { color: theme.colors.text }]}>{item.title}</Text><Text style={[styles.description, { color: theme.colors.textSecondary }]}>{item.description}</Text></View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </Pressable>)}
          </ScrollView>
          <View style={[styles.footer, { borderColor: theme.colors.border }]}>
            <Pressable accessibilityRole="button" style={[styles.signOut, { backgroundColor: theme.isDark ? '#401C29' : '#FFF1F2', borderColor: theme.isDark ? '#88334C' : '#FFB7C7' }]} onPress={() => { setOpen(false); void logout().then(() => router.replace('/(auth)/login')); }}>
              <LogOut size={17} color={theme.isDark ? '#FDA4AF' : '#BE123C'} /><Text style={{ color: theme.isDark ? '#FDA4AF' : '#BE123C', fontSize: 14, fontWeight: '600' }}>Sign Out / Switch Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    <ProfileEditModal visible={profile} onClose={() => setProfile(false)} />
  </Context.Provider>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 640, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 20, paddingRight: 12, paddingVertical: 8, borderBottomWidth: 1 },
  heading: { fontSize: 16, fontWeight: '700' },
  institute: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  instituteText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  iconButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 20 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1 },
  signOut: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, borderWidth: 1 },
});
