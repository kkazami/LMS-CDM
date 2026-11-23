import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, UserRound, X, type LucideIcon } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../common/Button';
import { SurfacePressable } from '../motion/SurfacePressable';
import { useMobilePresentation } from '../presentation/MobilePresentation';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useReducedMotion } from '../../lib/design-system';
import { useAnnouncement } from '../../hooks/useAnnouncement';
import { ProfileEditModal } from '../profile/ProfileEditModal';
import type { MoreMenuContextType } from './MoreMenuDrawer';

type Item = { icon: LucideIcon; title: string; description: string; route: string };
function focus(target: React.ComponentRef<typeof View> | null) {
  if (!target) return;
  if (Platform.OS === 'web') target.focus();
  else { const handle = findNodeHandle(target); if (handle) AccessibilityInfo.setAccessibilityFocus(handle); }
}

export function IcsToolsMenu({ children, teacher, items, context: Context }: {
  children: React.ReactNode; teacher: boolean; items: Item[]; context: React.Context<MoreMenuContextType>;
}) {
  const theme = useTheme(), router = useRouter(), insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { toolsReturnFocus } = useMobilePresentation();
  const reduced = useReducedMotion();
  const [isOpen, setOpen] = useState(false), [profile, setProfile] = useState(false);
  const [confirm, setConfirm] = useState<'logout' | null>(null);
  const user = useAuthStore(s => s.user), logout = useAuthStore(s => s.logout);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const title = useRef<Text>(null);
  const restoreFocus = useRef(true);
  const wasOpen = useRef(false);
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const tint = theme.isDark ? '#382419' : '#FFF0E5';
  const groups = teacher ? [{ title: 'Teaching tools', items: items.filter(i => !['Archived Classes', 'Organizational Chart', 'Leaderboard Manager'].includes(i.title)) },
    { title: 'Class management', items: items.filter(i => ['Archived Classes', 'Organizational Chart', 'Leaderboard Manager'].includes(i.title)) }]
    : [{ title: 'Learning tools', items: items.filter(i => /\/(?:codelab|ohmward|knowledge-exchange|practical-labs)(?:\?|$)/.test(i.route)) }, { title: 'Study & progress', items: items.filter(i => !/\/(?:codelab|ohmward|knowledge-exchange|practical-labs)(?:\?|$)/.test(i.route)) }];
  useAnnouncement(confirm ? 'Your saved work stays on this device. Sign out to continue.' : undefined, true);
  useEffect(() => {
    const closed = wasOpen.current && !isOpen;
    wasOpen.current = isOpen;
    if (Platform.OS === 'ios' || !closed || !restoreFocus.current) return;
    const target = toolsReturnFocus.current;
    const timer = setTimeout(() => { if (restoreFocus.current && target === toolsReturnFocus.current) focus(target); }, reduced ? 0 : 240);
    return () => clearTimeout(timer);
  }, [isOpen, reduced, toolsReturnFocus]);
  function open() { restoreFocus.current = true; setOpen(true); }
  function close() { setOpen(false); setConfirm(null); }
  function navigate(route: string) { restoreFocus.current = false; close(); router.push(route as never); }
  async function leave() { restoreFocus.current = false; close(); await logout(); router.replace('/(auth)/login'); }
  return <Context.Provider value={{ isOpen, openMenu: open, closeMenu: close, toggleMenu: () => { if (isOpen) close(); else open(); } }}>
    <View style={{ flex: 1 }} accessibilityElementsHidden={isOpen} importantForAccessibility={isOpen ? 'no-hide-descendants' : 'auto'}>{children}</View>
    <Modal visible={isOpen} transparent animationType={reduced ? 'none' : 'slide'}
      onRequestClose={close} onShow={() => focus(title.current)} onDismiss={() => { if (!profile && restoreFocus.current) focus(toolsReturnFocus.current); }}>
      <View style={styles.overlay}>
        <SurfacePressable aria-hidden onPress={close} style={StyleSheet.absoluteFill} />
        <View testID="ics-tools-sheet-v2" accessibilityViewIsModal onAccessibilityEscape={close}
          style={[styles.sheet, { backgroundColor: theme.colors.card, maxHeight: height - insets.top - 20, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={styles.header}><Text ref={title} accessible accessibilityRole="header" style={[styles.heading, { color: theme.colors.text }]}>{teacher ? 'Instructor tools' : 'Your learning space'}</Text>
            <SurfacePressable accessibilityRole="button" accessibilityLabel="Close tools menu" onPress={close} style={[styles.circle, { backgroundColor: theme.colors.cardSecondary }]}><X size={20} color={theme.colors.text} /></SurfacePressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={[styles.profile, { backgroundColor: theme.colors.cardSecondary }]}>
              <SurfacePressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => setProfile(true)} style={styles.profileButton}>
                <View style={[styles.avatar, { backgroundColor: tint }]}><UserRound size={22} color={accent} /></View>
                <View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.colors.text }]}>{user?.name}</Text><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? 'Professor' : 'Student'} · ICS</Text></View>
              </SurfacePressable>
              <Switch accessibilityLabel="Dark appearance" style={{ minHeight: 48, minWidth: 48 }} value={theme.isDark} onValueChange={() => { void toggleTheme(); }} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} />
            </View>
            {groups.map(group => <View key={group.title} style={{ marginTop: 24 }}><Text accessibilityRole="header" style={[styles.groupTitle, { color: theme.colors.text }]}>{group.title}</Text>
              <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.cardSecondary }}>{group.items.map((item, index) => <SurfacePressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint={item.description} onPress={() => navigate(item.route)}
                style={[styles.item, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <item.icon color={accent} size={21} aria-hidden /><View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.colors.text }]}>{item.title}</Text><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{item.description}</Text></View><ChevronRight size={17} color={theme.colors.textSecondary} aria-hidden />
              </SurfacePressable>)}</View>
            </View>)}
            <View style={[styles.account, { borderTopColor: theme.colors.border }]}>
              <SurfacePressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => setConfirm('logout')} style={[styles.item, { marginTop: 12, borderRadius: 16, backgroundColor: theme.colors.dangerBg }]}><LogOut size={20} color={theme.colors.danger} /><Text style={[styles.label, { color: theme.colors.danger }]}>Sign out</Text></SurfacePressable>
              {confirm && <View accessibilityRole="alert" style={[styles.confirmation, { borderColor: theme.colors.border }]}><Text style={[styles.label, { color: theme.colors.text }]}>Sign out of CdM LMS?</Text><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Your saved work stays on this device.</Text><Button title="Confirm sign out" variant="danger" onPress={() => { void leave(); }} /><Button title="Cancel" variant="ghost" onPress={() => setConfirm(null)} /></View>}
            </View>
          </ScrollView>
        </View>
      </View>
      <ProfileEditModal visible={profile} onClose={() => setProfile(false)} />
    </Modal>
  </Context.Provider>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 640, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 34, height: 4, borderRadius: 2, marginTop: 10, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { fontSize: 21, lineHeight: 29, fontWeight: '700', flex: 1 },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  profile: { borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profileButton: { flex: 1, minWidth: 160, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 22, fontWeight: '600', flexShrink: 1 },
  detail: { fontSize: 13, lineHeight: 20, marginTop: 2 },
  groupTitle: { fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 10 },
  item: { paddingHorizontal: 14, paddingVertical: 14, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  account: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingTop: 12 },
  confirmation: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12, marginTop: 12 },
});
