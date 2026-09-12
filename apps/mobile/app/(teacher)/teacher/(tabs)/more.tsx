import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  GraduationCap,
  BookOpen,
  FolderDown,
  Moon,
  LogOut,
  ChevronRight,
  Shield,
  FileCheck,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useThemeStore } from '../../../../src/stores/theme-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { ProfileEditModal } from '../../../../src/components/profile/ProfileEditModal';
import { TOUCH_TARGET } from '../../../../src/lib/typography';

export default function TeacherMoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useTheme();

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of CdM LMS?', [
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

  const getInitials = (name?: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
          style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              Prof. {user?.name || 'Faculty Member'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
              {user?.email}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label={user?.institute?.name || theme.name} variant="primary" size="sm" />
              <Badge label={user?.role || 'PROFESSOR'} variant="info" size="sm" />
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Faculty Tools */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
            FACULTY MANAGEMENT
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Course Materials"
              style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                router.push('/teacher/(tabs)/courses' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                <FolderDown size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Syllabus & Materials</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Upload reading documents and lecture slides
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Pending Submissions"
              style={styles.menuItem}
              onPress={() => {
                router.push('/teacher/(tabs)/courses' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.success}15` }]}>
                <FileCheck size={20} color={theme.colors.success} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Grading Queue</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Fast-track pending student assignments
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
            PREFERENCES & SETTINGS
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.info}15` }]}>
                <Moon size={20} color={theme.colors.info} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#6B728015' }]}>
                <Shield size={20} color="#6B7280" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Faculty Role</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Academic Instructor &bull; {user?.institute?.code?.toUpperCase() || 'ICS'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            icon={LogOut}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>

      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    minHeight: TOUCH_TARGET,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutContainer: {
    marginTop: 8,
  },
  logoutButton: {
    minHeight: 50,
  },
});
