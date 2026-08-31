import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import {
  ClipboardList,
  Flame,
  CheckSquare,
  Layers,
  Trophy,
  Award,
  User,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

export default function MoreMenuScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const menuSections = [
    {
      title: 'ACADEMIC TOOLS',
      items: [
        { label: 'To-do & Assignments', icon: ClipboardList, route: '/(tabs)/' + instituteCode + '/assignments' },
        { label: 'Flashcards Study', icon: Flame, route: '/(tabs)/' + instituteCode + '/flashcards' },
        { label: 'Learning Materials', icon: Layers, route: '/(tabs)/' + instituteCode + '/materials' },
        { label: 'Leaderboard & Rankings', icon: Trophy, route: '/(tabs)/' + instituteCode + '/leaderboards' },
        { label: 'Achievements & Badges', icon: Award, route: '/(tabs)/' + instituteCode + '/achievements' },
      ],
    },
    {
      title: 'PERSONAL WORKSPACE',
      items: [
        { label: 'Notes, Tasks & Calendar', icon: CheckSquare, route: '/(tabs)/' + instituteCode + '/tasks' },
      ],
    },
    {
      title: 'ACCOUNT & SUPPORT',
      items: [
        { label: 'My Profile', icon: User, route: '/(tabs)/' + instituteCode + '/profile' },
        { label: 'Help & Support', icon: HelpCircle, route: '/(tabs)/' + instituteCode + '/more/help' },
        { label: 'Privacy Policy', icon: Shield, route: '/(tabs)/' + instituteCode + '/more/privacy' },
        { label: 'Settings & Appearance', icon: Settings, route: '/(tabs)/' + instituteCode + '/more/settings' },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="More Features" subtitle="Directory & Account Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionBox}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {section.items.map((item, iIdx) => {
                const IconComp = item.icon;
                return (
                  <TouchableOpacity
                    key={iIdx}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={[
                      styles.menuItem,
                      iIdx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
                    ]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                      <IconComp size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.itemLabel, typography.bodyMd, { color: theme.colors.text }]}>
                      {item.label}
                    </Text>
                    <ChevronRight size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { backgroundColor: theme.colors.card, borderColor: '#FEE2E2', minHeight: TOUCH_TARGET },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  sectionBox: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    minHeight: TOUCH_TARGET,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
