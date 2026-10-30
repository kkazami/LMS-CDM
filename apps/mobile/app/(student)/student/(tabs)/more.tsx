import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Layers,
  CheckSquare,
  Award,
  FolderDown,
  Moon,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  Video,
  MessageSquare,
  ExternalLink,
  Code2,
  Table,
  FileText,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useThemeStore } from '../../../../src/stores/theme-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Button } from '../../../../src/components/common/Button';
import { ProfileEditModal } from '../../../../src/components/profile/ProfileEditModal';
import { Screen } from '../../../../src/components/ui';
import { getCanonicalInstituteName } from '../../../../src/lib/theme';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { isIteUser, isIcsUser } from '../../../../src/lib/ite-eligibility';
import { getWebBaseUrl } from '../../../../src/lib/constants';

import { useMoreMenu } from '../../../../src/components/navigation/MoreMenuDrawer';

export default function StudentMoreScreen() {
  const router = useRouter();
  const { openMenu } = useMoreMenu();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useTheme();

  React.useEffect(() => {
    openMenu();
    router.replace('/student/dashboard');
  }, [openMenu, router]);

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleOpenWeb = async (subPath: string) => {
    try {
      const instituteCode = (user?.institute?.code || 'ics').toLowerCase();
      const baseUrl = getWebBaseUrl();
      const url = `${baseUrl}/${instituteCode}${subPath.startsWith('/') ? subPath : `/${subPath}`}`;
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open Web Link', `Please open ${url} in your browser.`);
      }
    } catch {
      Alert.alert('Error', 'Unable to open the web link.');
    }
  };

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
    if (!name) return 'S';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Screen scrollable={false} withTopInset={true}>
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
             <Text style={[styles.avatarInitials, { color: theme.colors.surface }]}>{getInitials(user?.name)}</Text>
           </View>
           <View style={styles.profileText}>
             <Text style={[styles.profileName, { color: theme.colors.text }]}>
               {user?.name || 'Student Account'}
             </Text>
             <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
               {user?.email}
             </Text>
             <View style={styles.badgeRow}>
               <Badge label={getCanonicalInstituteName(user?.institute?.code, user?.institute?.name || theme.name)} variant="primary" size="sm" />
               {user?.studentNumber && (
                 <Badge label={user.studentNumber} variant="default" size="sm" />
               )}
             </View>
           </View>
           <ChevronRight size={20} color={theme.colors.textSecondary} />
         </TouchableOpacity>

        {/* Academic Utilities */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
            STUDY & WORKSPACE
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {isIteUser(user) && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Class Meetings"
                style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  router.push('/student/meetings' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.info}15` }]}>
                  <Video size={20} color={theme.colors.info} />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Class Meetings</Text>
                  <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                    Join virtual sessions and view schedule
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Study Flashcards"
              style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
              onPress={() => {
                router.push('/student/flashcards' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Layers size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Flashcards</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Spaced-repetition active recall decks
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Personal Tasks & Notes"
              style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
              onPress={() => {
                router.push('/student/tasks' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.warning}15` }]}>
                <CheckSquare size={20} color={theme.colors.warning} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Workspace Planner</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Personal study tasks and subject notes
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {isIcsUser(user) && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Knowledge Exchange"
                style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  router.push('/student/knowledge-exchange' as any);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <MessageSquare size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Knowledge Exchange</Text>
                  <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                    ICS Q&A forum, solved solutions, and discussions
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Badges and Achievements"
              style={styles.menuItem}
              onPress={() => {
                router.push('/student/achievements' as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.success}15` }]}>
                <Award size={20} color={theme.colors.success} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Badges & Rewards</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Track streaks, unlock badges, and level up
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* More on the Web Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
            MORE ON THE WEB
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {isIcsUser(user) && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open CodeLab"
                style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                onPress={() => router.push('/student/codelab')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Code2 size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>CodeLab</Text>
                  <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                    Monaco code editor with 3D scene execution (Desktop)
                  </Text>
                </View>
                <ExternalLink size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open Academic Gradebook Matrix on web"
              style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
              onPress={() => handleOpenWeb('/grades')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.success}15` }]}>
                <Table size={20} color={theme.colors.success} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Full Academic Gradebook</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Full syllabus weighting & calculation matrix
                </Text>
              </View>
              <ExternalLink size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open Quizzes and Interactive Forms on web"
              style={styles.menuItem}
              onPress={() => handleOpenWeb('/assignments')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${theme.colors.warning}15` }]}>
                <FileText size={20} color={theme.colors.warning} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Quizzes & Interactive Forms</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  Complex timed assessments and dynamic questionnaires
                </Text>
              </View>
              <ExternalLink size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionHeading, { color: theme.colors.textSecondary }]}>
            PREFERENCES & SETTINGS
          </Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
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
                thumbColor={theme.colors.card}
              />
            </View>

            <View style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Shield size={20} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>Institute Code</Text>
                <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                  {user?.institute?.code?.toUpperCase() || 'ICS'} - CdM LMS Mobile v1.0.0
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
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
