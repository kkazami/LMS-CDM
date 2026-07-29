import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import {
  ClipboardList,
  Trophy,
  FlaskConical,
  User,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  ListTodo,
} from 'lucide-react-native';

export default function MoreMenuScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const menuGroups = [
    {
      title: 'LMS Features',
      items: [
        { label: 'Assignments', icon: ClipboardList, route: `/(tabs)/${instituteCode}/assignments` },
        { label: 'Leaderboard', icon: Trophy, route: `/(tabs)/${instituteCode}/leaderboards` },
        { label: 'Tasks', icon: ListTodo, route: `/(tabs)/${instituteCode}/tasks` },
        { label: 'Interactive Labs', icon: FlaskConical, route: `/(tabs)/${instituteCode}/activities` },
      ],
    },
    {
      title: 'Account & Settings',
      items: [
        { label: 'Profile', icon: User, route: `/(tabs)/${instituteCode}/profile` },
        { label: 'Settings', icon: Settings, route: `/(tabs)/${instituteCode}/more/settings` },
        { label: 'Help & Support', icon: HelpCircle, route: `/(tabs)/${instituteCode}/more/help` },
        { label: 'Privacy Policy', icon: Shield, route: `/(tabs)/${instituteCode}/more/privacy` },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="More Menu" subtitle="All features and settings" />

      <ScrollView contentContainerStyle={styles.content}>
        {menuGroups.map((group, groupIdx) => (
          <View key={groupIdx} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.card}>
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.menuItem, idx > 0 && styles.itemBorder]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}12` }]}>
                      <Icon size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#2C2727', flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 16, borderRadius: 14, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
});
