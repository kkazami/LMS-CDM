import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useThemeStore } from '../../../../src/stores/theme-store';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { Moon, Bell, LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const { isDark, setThemePreference } = useThemeStore();

  const toggleDarkMode = (val: boolean) => {
    setThemePreference(val ? 'dark' : 'light');
  };

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
      <ScreenHeader title="Settings & Preferences" subtitle="Display, Notifications & Account" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Moon size={18} color={theme.colors.primary} />
              <Text style={[styles.settingTitle, typography.bodyMd, { color: theme.colors.text }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Bell size={18} color={theme.colors.primary} />
              <Text style={[styles.settingTitle, typography.bodyMd, { color: theme.colors.text }]}>
                Assignment Reminders
              </Text>
            </View>
            <Switch value={true} trackColor={{ false: '#D1D5DB', true: theme.colors.primary }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>ACCOUNT & SYSTEM</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <TouchableOpacity style={[styles.settingRow, { minHeight: TOUCH_TARGET }]} onPress={handleLogout}>
            <View style={styles.settingLabelRow}>
              <LogOut size={18} color="#EF4444" />
              <Text style={[styles.settingTitle, typography.bodyMd, { color: '#EF4444' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingTitle: {
    fontWeight: '600',
  },
});
