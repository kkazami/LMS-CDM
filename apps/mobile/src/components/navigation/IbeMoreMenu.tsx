import React, { useState, useRef } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  LogOut,
  UserRound,
  X,
  Briefcase,
  FileSpreadsheet,
  Trophy,
  BookOpen,
  UserCheck,
  Layers,
  CheckSquare,
  Award,
  Bell,
  Sparkles,
  Sun,
  Moon,
  BarChart2,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react-native';
import { Text } from '../ui/Text';
import { Button } from '../common/Button';
import { SurfacePressable } from '../motion/SurfacePressable';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useReducedMotion } from '../../lib/design-system';
import { ProfileEditModal } from '../profile/ProfileEditModal';
import { isBsbaHrmUser, isBsEntrepUser } from '../../lib/ite-eligibility';
import { getWebBaseUrl } from '../../lib/constants';
import { openSafeUrl } from '../../lib/open-link';
import type { MoreMenuContextType } from './MoreMenuDrawer';

interface ToolItem {
  icon: LucideIcon;
  title: string;
  description: string;
  route?: string;
  feature?: string;
}

export function IbeMoreMenu({
  children,
  role,
  context: Context,
}: {
  children: React.ReactNode;
  role: 'STUDENT' | 'TEACHER';
  context: React.Context<MoreMenuContextType>;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [isOpen, setOpen] = useState(false);
  const [profile, setProfile] = useState(false);

  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const toggleTheme = useThemeStore(s => s.toggleTheme);

  const teacher = role === 'TEACHER';
  const isEntrep = isBsEntrepUser(user);
  const isHrm = isBsbaHrmUser(user);

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';
  const goldTint = theme.isDark ? '#3D2A08' : '#FFF9E6';
  const goldBorder = theme.isDark ? '#6B4C0A' : '#F3D580';

  const programBadge = isEntrep ? 'BS ENTREP' : isHrm ? 'BSBA HRM' : 'IBE';

  // Program tools for BS Entrepreneurship
  const entrepTools: ToolItem[] = [
    {
      icon: Briefcase,
      title: 'Business Plan Guide',
      description: '14 sequential entrepreneurship lessons and venture builder',
      feature: 'business-plan',
    },
    {
      icon: FileSpreadsheet,
      title: 'Financial Statements',
      description: 'Income Statement, Balance Sheet, Cash Flow & Equity reports',
      feature: 'financial-statements',
    },
    {
      icon: Trophy,
      title: 'Entrepreneur Hall of Fame',
      description: '10 famous entrepreneurs, achievements & career milestones',
      feature: 'hall-of-fame',
    },
    {
      icon: BookOpen,
      title: 'IBE Learning Hub',
      description: 'Business, finance, marketing & operations courses',
      feature: 'learning-hub',
    },
  ];

  // Program tools for BSBA HRM
  const hrmTools: ToolItem[] = [
    {
      icon: UserCheck,
      title: 'Mock Interview AI',
      description: 'AI coach, 36 sample answers & Recruiter Mode simulation',
      feature: 'mock-interview',
    },
    {
      icon: BookOpen,
      title: 'IBE WordWise',
      description: '150,000+ Dictionary & Academic HR vocabulary categories',
      feature: 'wordwise',
    },
    {
      icon: Trophy,
      title: 'HR Leaders Hall of Fame',
      description: '10 famous HR leaders & ethical workplace management',
      feature: 'hall-of-fame',
    },
    {
      icon: Briefcase,
      title: 'HR Policy & Labor Hub',
      description: 'Workplace dispute resolution & compliance guides',
      feature: 'learning-hub',
    },
  ];

  // General study & workspace tools
  const studyTools: ToolItem[] = [
    {
      icon: Layers,
      title: 'Flashcards',
      description: 'Spaced-repetition active recall decks',
      route: teacher ? '/teacher/flashcards' : '/student/flashcards',
    },
    {
      icon: CheckSquare,
      title: 'Study Tasks',
      description: 'Personal study tasks and workspace notes',
      route: teacher ? '/teacher/tasks' : '/student/tasks',
    },
    {
      icon: Trophy,
      title: 'Leaderboard',
      description: 'Academic rankings & top performers',
      route: teacher ? '/teacher/leaderboard' : '/student/leaderboard',
    },
    {
      icon: Award,
      title: 'Badges & Achievements',
      description: 'Learning streaks, trophies & milestones',
      route: teacher ? '/teacher/achievements' : '/student/achievements',
    },
    {
      icon: Bell,
      title: 'Campus Bulletins',
      description: 'Official institute notices & updates',
      route: teacher ? '/teacher/announcements' : '/student/announcements',
    },
  ];

  // Faculty tools for IBE teachers
  const facultyTools: ToolItem[] = [
    {
      icon: UserCheck,
      title: 'Attendance Management',
      description: 'Record and review student attendance',
      route: '/teacher/attendance',
    },
    {
      icon: BarChart2,
      title: 'Class Analytics',
      description: 'Student metrics, engagement & course progress',
      route: '/teacher/analytics',
    },
    {
      icon: BookOpen,
      title: 'My Classes & Gradebook',
      description: 'Manage enrolled students and grade coursework',
      route: '/teacher/courses',
    },
    {
      icon: CheckSquare,
      title: 'Schedule & Tasks',
      description: 'Faculty agenda, tasks, and deadlines',
      route: '/teacher/tasks',
    },
    {
      icon: Bell,
      title: 'Campus Bulletins',
      description: 'Official institute notices & updates',
      route: '/teacher/announcements',
    },
  ];

  const facultyResources: ToolItem[] = [
    {
      icon: Layers,
      title: 'Study Decks',
      description: 'Course flashcard review sets',
      route: '/teacher/flashcards',
    },
    {
      icon: Trophy,
      title: 'Student Leaderboard',
      description: 'Academic rankings & top performers',
      route: '/teacher/leaderboard',
    },
    {
      icon: Award,
      title: 'Badges & Achievements',
      description: 'Student learning milestones & badges',
      route: '/teacher/achievements',
    },
  ];

  const groups = teacher
    ? [
        {
          title: 'Faculty Suite',
          items: facultyTools,
        },
        {
          title: 'Academic Resources',
          items: facultyResources,
        },
      ]
    : [
        {
          title: isHrm ? 'HRM Specialized Tools' : 'Entrepreneurship Tools',
          items: isHrm ? hrmTools : entrepTools,
        },
        {
          title: 'Study & Progress',
          items: studyTools,
        },
      ];

  function open() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function handleItemPress(item: ToolItem) {
    close();
    if (item.feature) {
      const baseUrl = getWebBaseUrl();
      const url = `${baseUrl}/ibe/${item.feature}`;
      if (Platform.OS === 'web') {
        void openSafeUrl(url);
        return;
      }
      setTimeout(() => {
        router.push({
          pathname: teacher ? '/teacher/feature' : '/student/feature',
          params: { feature: item.feature },
        } as never);
      }, 120);
      return;
    }

    if (item.route) {
      setTimeout(() => {
        router.push(item.route as never);
      }, 120);
    }
  }

  async function handleLeave() {
    close();
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <Context.Provider
      value={{
        isOpen,
        openMenu: open,
        closeMenu: close,
        toggleMenu: () => {
          if (isOpen) close();
          else open();
        },
      }}
    >
      <View style={{ flex: 1 }}>{children}</View>

      <Modal
        visible={isOpen}
        transparent
        animationType={reduced ? 'none' : 'slide'}
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <SurfacePressable
            aria-hidden
            onPress={close}
            style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          />

          <View
            testID="ibe-tools-sheet"
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.card,
                maxHeight: height - insets.top - 20,
                paddingBottom: Math.max(insets.bottom, 16),
                zIndex: 2,
              },
            ]}
          >
            {/* Top Pull Handle */}
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

            {/* Sheet Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.text }]}>
                  {teacher ? 'Faculty Suite' : 'Your Learning Space'}
                </Text>
                <View style={[styles.instituteTag, { backgroundColor: goldTint, borderColor: goldBorder }]}>
                  <Sparkles size={11} color={goldAccent} />
                  <Text style={[styles.instituteTagText, { color: goldAccent }]}>
                    {teacher ? 'IBE FACULTY · INSTITUTE OF BUSINESS & ENTREPRENEURSHIP' : `${programBadge} · INSTITUTE OF BUSINESS & ENTREPRENEURSHIP`}
                  </Text>
                </View>
              </View>

              <SurfacePressable
                accessibilityRole="button"
                accessibilityLabel="Close tools menu"
                onPress={close}
                style={[styles.circle, { backgroundColor: theme.colors.cardSecondary }]}
              >
                <X size={20} color={theme.colors.text} />
              </SurfacePressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Profile Card with Quick Dark Mode Switch */}
              <View style={[styles.profile, { backgroundColor: theme.colors.cardSecondary }]}>
                <SurfacePressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => setProfile(true)}
                  style={styles.profileButton}
                >
                  <View style={[styles.avatar, { backgroundColor: goldTint, borderColor: goldBorder, borderWidth: 1 }]}>
                    <UserRound size={22} color={goldAccent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
                      {user?.name || (teacher ? 'IBE Professor' : 'IBE Scholar')}
                    </Text>
                    <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>
                      {teacher ? 'Professor · IBE Faculty' : `Student · ${programBadge}`}
                    </Text>
                  </View>
                </SurfacePressable>

                <SurfacePressable
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${theme.isDark ? 'light' : 'dark'} mode`}
                  onPress={() => { void toggleTheme(); }}
                  style={[
                    styles.themeToggleBtn,
                    {
                      backgroundColor: theme.isDark ? '#3D2A08' : '#FFF9E6',
                      borderColor: theme.isDark ? '#6B4C0A' : '#F3D580',
                    },
                  ]}
                >
                  {theme.isDark ? (
                    <Sun size={20} color={goldAccent} />
                  ) : (
                    <Moon size={20} color={goldAccent} />
                  )}
                </SurfacePressable>
              </View>

              {/* Segmented Feature Groups */}
              {groups.map(group => (
                <View key={group.title} style={{ marginTop: 22 }}>
                  <Text accessibilityRole="header" style={[styles.groupTitle, { color: theme.colors.text }]}>
                    {group.title}
                  </Text>

                  <View
                    style={[
                      styles.groupContainer,
                      {
                        backgroundColor: theme.colors.cardSecondary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    {group.items.map((item, index) => (
                      <SurfacePressable
                        key={item.title}
                        accessibilityRole="button"
                        accessibilityLabel={item.title}
                        accessibilityHint={item.description}
                        onPress={() => handleItemPress(item)}
                        style={[
                          styles.item,
                          index > 0 && {
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: theme.colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.itemIconBox, { backgroundColor: goldTint, borderColor: goldBorder }]}>
                          <item.icon color={goldAccent} size={19} aria-hidden />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.itemDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {item.description}
                          </Text>
                        </View>

                        <ChevronRight size={17} color={theme.colors.textSecondary} aria-hidden />
                      </SurfacePressable>
                    ))}
                  </View>
                </View>
              ))}

              {/* Sign Out Section */}
              <View style={[styles.account, { borderTopColor: theme.colors.border }]}>
                <SurfacePressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  onPress={() => {
                    void handleLeave();
                  }}
                  style={[styles.signOutBtn, { backgroundColor: theme.colors.dangerBg }]}
                >
                  <LogOut size={18} color={theme.colors.danger} />
                  <Text style={[styles.signOutText, { color: theme.colors.danger }]}>
                    Sign out
                  </Text>
                </SurfacePressable>
              </View>
            </ScrollView>
          </View>
        </View>

        <ProfileEditModal visible={profile} onClose={() => setProfile(false)} />
      </Modal>
    </Context.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  instituteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  instituteTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    marginTop: 6,
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
  },
  groupTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupContainer: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  account: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmation: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  confirmActions: {
    gap: 8,
    marginTop: 4,
  },
});

