import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { ScreenWrapper } from '../../../../src/components/common/ScreenWrapper';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { ProfileEditModal } from '../../../../src/components/profile/ProfileEditModal';

export default function TeacherMoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

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
    <ScreenWrapper withTopInset={true}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: s(14),
            paddingBottom: bottomClearance,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              padding: s(13),
              borderRadius: s(14),
              marginBottom: s(14),
            },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: theme.colors.primary,
                width: s(46),
                height: s(46),
                borderRadius: s(23),
                marginRight: s(12),
              },
            ]}
          >
            <Text
              style={[styles.avatarInitials, { fontSize: font(17) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {getInitials(user?.name)}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text
              style={[styles.profileName, { color: theme.colors.text, fontSize: font(16) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              Prof. {user?.name || 'Faculty Member'}
            </Text>
            <Text
              style={[styles.profileEmail, { color: theme.colors.textSecondary, fontSize: font(12), marginBottom: s(6) }]}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {user?.email}
            </Text>
            <View style={[styles.badgeRow, { gap: s(5) }]}>
              <Badge label={user?.institute?.name || theme.name} variant="primary" size="sm" />
              <Badge label={user?.role || 'PROFESSOR'} variant="info" size="sm" />
            </View>
          </View>
          <ChevronRight size={s(18)} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Faculty Tools */}
        <View style={[styles.menuSection, { marginBottom: s(14) }]}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: theme.colors.textSecondary,
                fontSize: font(10.5),
                marginBottom: s(6),
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            FACULTY MANAGEMENT
          </Text>

          <View
            style={[
              styles.menuGroup,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(13),
              },
            ]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Course Materials"
              style={[styles.menuItem, { borderBottomColor: theme.colors.border, paddingVertical: s(10), paddingHorizontal: s(12), minHeight: s(40) }]}
              onPress={() => {
                router.push('/teacher/(tabs)/courses' as any);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor: `${theme.colors.primary}15`,
                    width: s(32),
                    height: s(32),
                    borderRadius: s(8),
                    marginRight: s(10),
                  },
                ]}
              >
                <FolderDown size={s(16)} color={theme.colors.primary} />
              </View>
              <View style={styles.menuItemText}>
                <Text
                  style={[styles.menuItemTitle, { color: theme.colors.text, fontSize: font(13.5) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Syllabus & Materials
                </Text>
                <Text
                  style={[styles.menuItemDesc, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Upload reading documents and lecture slides
                </Text>
              </View>
              <ChevronRight size={s(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Pending Submissions"
              style={[styles.menuItem, { paddingVertical: s(10), paddingHorizontal: s(12), minHeight: s(40) }]}
              onPress={() => {
                router.push('/teacher/(tabs)/courses' as any);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor: `${theme.colors.success}15`,
                    width: s(32),
                    height: s(32),
                    borderRadius: s(8),
                    marginRight: s(10),
                  },
                ]}
              >
                <FileCheck size={s(16)} color={theme.colors.success} />
              </View>
              <View style={styles.menuItemText}>
                <Text
                  style={[styles.menuItemTitle, { color: theme.colors.text, fontSize: font(13.5) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Grading Queue
                </Text>
                <Text
                  style={[styles.menuItemDesc, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  Fast-track pending student assignments
                </Text>
              </View>
              <ChevronRight size={s(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Preferences */}
        <View style={[styles.menuSection, { marginBottom: s(14) }]}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: theme.colors.textSecondary,
                fontSize: font(10.5),
                marginBottom: s(6),
              },
            ]}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            PREFERENCES & SETTINGS
          </Text>

          <View
            style={[
              styles.menuGroup,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderRadius: s(13),
              },
            ]}
          >
            <View style={[styles.menuItem, { borderBottomColor: theme.colors.border, paddingVertical: s(8), paddingHorizontal: s(12), minHeight: s(40) }]}>
              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor: `${theme.colors.info}15`,
                    width: s(32),
                    height: s(32),
                    borderRadius: s(8),
                    marginRight: s(10),
                  },
                ]}
              >
                <Moon size={s(16)} color={theme.colors.info} />
              </View>
              <View style={styles.menuItemText}>
                <Text
                  style={[styles.menuItemTitle, { color: theme.colors.text, fontSize: font(13.5) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Dark Mode
                </Text>
                <Text
                  style={[styles.menuItemDesc, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
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

            <View style={[styles.menuItem, { paddingVertical: s(10), paddingHorizontal: s(12), minHeight: s(40) }]}>
              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor: '#6B728015',
                    width: s(32),
                    height: s(32),
                    borderRadius: s(8),
                    marginRight: s(10),
                  },
                ]}
              >
                <Shield size={s(16)} color="#6B7280" />
              </View>
              <View style={styles.menuItemText}>
                <Text
                  style={[styles.menuItemTitle, { color: theme.colors.text, fontSize: font(13.5) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Faculty Role
                </Text>
                <Text
                  style={[styles.menuItemDesc, { color: theme.colors.textSecondary, fontSize: font(11) }]}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  Academic Instructor &bull; {user?.institute?.code?.toUpperCase() || 'ICS'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={[styles.logoutContainer, { marginTop: s(4) }]}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            icon={LogOut}
            style={{ minHeight: s(40), borderRadius: s(10) }}
            textStyle={{ fontSize: font(13.5) }}
          />
        </View>
      </ScrollView>

      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 6,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontWeight: '700',
  },
  profileEmail: {
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  menuSection: {},
  sectionHeading: {
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  menuGroup: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: '600',
  },
  menuItemDesc: {
    marginTop: 1,
  },
  logoutContainer: {},
});
