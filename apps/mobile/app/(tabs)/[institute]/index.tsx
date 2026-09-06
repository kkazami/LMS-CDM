import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useTheme } from '../../../src/hooks/useTheme';
import { SkeletonLoader } from '../../../src/components/common/SkeletonLoader';
import { OfflineBanner } from '../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../src/lib/typography';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Flame,
  Zap,
  Award,
  Plus,
  ClipboardList,
  CheckSquare,
  Trophy,
  ChevronRight,
  User,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react-native';
import type { Course, Assignment, GamificationProfile } from '@lms/types';

function getRelativeDueBadge(dueDateStr?: string | null): { label: string; bg: string; text: string } {
  if (!dueDateStr) return { label: 'No Due Date', bg: '#F3F4F6', text: '#6B7280' };

  const dueDate = new Date(dueDateStr);
  const now = new Date();
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) {
    return { label: 'Overdue', bg: '#EF4444', text: '#FFFFFF' };
  }
  if (diffHours <= 24) {
    return { label: 'Due Today', bg: '#FEF3C7', text: '#D97706' };
  }
  if (diffHours <= 48) {
    return { label: 'Due Tomorrow', bg: '#FEF9C3', text: '#CA8A04' };
  }

  const monthDay = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label: 'Due ' + monthDay, bg: '#F3F4F6', text: '#4B5563' };
}

export default function DashboardHomeScreen() {
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const role = (user?.role || 'STUDENT').toUpperCase();
  const isProfessor = role === 'PROFESSOR' || role === 'TEACHER';
  const instituteCode = user?.institute?.code || 'ics';
  const instituteName = user?.institute?.name || 'Institute of Computing Studies';

  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    refetch: refetchCourses,
    isRefetching: isCoursesRefetching,
  } = useQuery({
    queryKey: ['courses', instituteCode],
    queryFn: () => api.courses.list(instituteCode),
  });

  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments,
    isRefetching: isAssignmentsRefetching,
  } = useQuery({
    queryKey: ['assignments', instituteCode],
    queryFn: () => api.assignments.list(instituteCode),
  });

  const {
    data: gamificationData,
    refetch: refetchGamification,
    isRefetching: isGamificationRefetching,
  } = useQuery({
    queryKey: ['gamification-profile'],
    queryFn: () => api.gamification.getProfile(),
  });

  const courses = coursesData?.courses || [];
  const dueSoon = assignmentsData?.assignments || [];
  const gamification = gamificationData?.profile;

  const isRefreshing = isCoursesRefetching || isAssignmentsRefetching || isGamificationRefetching;
  const isLoading = isCoursesLoading || isAssignmentsLoading;

  const onRefresh = async () => {
    await Promise.all([refetchCourses(), refetchAssignments(), refetchGamification()]);
  };

  const quickActions = [
    {
      label: isProfessor ? 'New Class' : 'Join Class',
      icon: Plus,
      highlight: true,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/courses' as any),
    },
    {
      label: 'To-do',
      icon: ClipboardList,
      badge: dueSoon.length > 0 ? '' + dueSoon.length : undefined,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/assignments' as any),
    },
    {
      label: 'Flashcards',
      icon: Flame,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/flashcards' as any),
    },
    {
      label: 'Tasks',
      icon: CheckSquare,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/tasks' as any),
    },
    {
      label: 'Materials',
      icon: Layers,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/materials' as any),
    },
    {
      label: 'Leaderboard',
      icon: Trophy,
      onPress: () => router.push('/(tabs)/' + instituteCode + '/leaderboards' as any),
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Banner */}
        <LinearGradient
          colors={[theme.colors.sidebar, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroGlowOverlay} />

          <View style={styles.heroContent}>
            <View style={styles.instituteBadge}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.instituteBadgeText}>
                {instituteName} • {isProfessor ? 'Faculty Portal' : 'Student Portal'}
              </Text>
            </View>

            <Text style={[styles.heroGreeting, typography.displayMd]}>
              Welcome back, {user?.name || 'Scholar'}! 👋
            </Text>
            <Text style={[styles.heroSub, typography.bodySm]}>
              {isProfessor
                ? 'Manage your active academic courses, syllabus, and submissions.'
                : 'Here is your academic overview and upcoming coursework.'}
            </Text>

            {/* Gamification Pills */}
            <View style={styles.gamificationRow}>
              <TouchableOpacity
                style={styles.gamificationPill}
                onPress={() => router.push('/(tabs)/' + instituteCode + '/leaderboards' as any)}
                activeOpacity={0.8}
              >
                <Flame size={14} color="#FBBF24" />
                <Text style={[styles.gamificationText, typography.tabularSm]}>
                  {(gamification?.currentStreak || 0) + ' Days Streak'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gamificationPill, { backgroundColor: 'rgba(255, 255, 255, 0.22)' }]}
                onPress={() => router.push('/(tabs)/' + instituteCode + '/achievements' as any)}
                activeOpacity={0.8}
              >
                <Zap size={14} color="#FDE047" />
                <Text style={[styles.gamificationText, typography.tabularSm]}>
                  {(gamification?.exp || 0) + ' EXP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gamificationPill, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
                onPress={() => router.push('/(tabs)/' + instituteCode + '/achievements' as any)}
                activeOpacity={0.8}
              >
                <Award size={14} color="#34D399" />
                <Text style={[styles.gamificationText, typography.tabularSm]}>
                  {'Lvl ' + (gamification?.level || 1)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Quick Action Chips */}
        <View style={styles.quickActionContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionScroll}
          >
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  style={[
                    styles.quickActionChip,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: action.highlight ? theme.colors.primary : theme.colors.border,
                    },
                    action.highlight && { backgroundColor: theme.colors.primary + '12' },
                  ]}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.quickActionIconBox,
                      { backgroundColor: theme.colors.primary + '18' },
                    ]}
                  >
                    <IconComponent size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>
                    {action.label}
                  </Text>
                  {action.badge ? (
                    <View
                      style={[
                        styles.quickActionBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.quickActionBadgeText}>{action.badge}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. My Classes Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View
              style={[
                styles.sectionIconBadge,
                { backgroundColor: theme.colors.primary + '18' },
              ]}
            >
              <GraduationCap size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.sectionHeading, typography.headingSm, { color: theme.colors.text }]}>
                {isProfessor ? 'My Teaching Classes' : 'My Enrolled Classes'}
              </Text>
              <Text style={[styles.sectionSub, typography.bodySm, { color: theme.colors.textSecondary }]}>
                {courses.length + ' active course' + (courses.length === 1 ? '' : 's')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isProfessor ? 'Create Class' : 'Join Class'}
            style={[
              styles.joinBtn,
              { backgroundColor: theme.colors.primary, minHeight: TOUCH_TARGET },
            ]}
            onPress={() => router.push('/(tabs)/' + instituteCode + '/courses' as any)}
            activeOpacity={0.85}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={styles.joinBtnText}>{isProfessor ? 'Create' : 'Join'}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <SkeletonLoader height={140} borderRadius={16} />
            <SkeletonLoader height={140} borderRadius={16} />
          </View>
        ) : courses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <BookOpen size={36} color={theme.colors.primary} style={{ opacity: 0.6, marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, typography.headingSm, { color: theme.colors.text }]}>
              {isProfessor ? 'No Classes Created' : 'No Courses Enrolled'}
            </Text>
            <Text style={[styles.emptySub, typography.bodySm, { color: theme.colors.textSecondary }]}>
              {isProfessor
                ? 'Create a course section to start publishing assignments and classwork.'
                : 'Join your class using the course code provided by your instructor.'}
            </Text>
          </View>
        ) : (
          <View style={styles.coursesStack}>
            {courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                accessibilityRole="button"
                accessibilityLabel={'Course: ' + course.title}
                style={[
                  styles.courseCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.9}
                onPress={() => router.push('/(tabs)/' + instituteCode + '/courses/' + course.id as any)}
              >
                <LinearGradient
                  colors={[theme.colors.sidebar, theme.colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.courseHeader}
                >
                  <View style={styles.courseBadgeRow}>
                    <View style={styles.codePill}>
                      <Text style={styles.codePillText}>{course.code || course.courseCode}</Text>
                    </View>
                    {course.section ? (
                      <View style={styles.sectionPill}>
                        <Text style={styles.sectionPillText}>{'Section ' + course.section}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.courseTitle, typography.headingSm]} numberOfLines={2}>
                    {course.title}
                  </Text>
                </LinearGradient>

                <View style={styles.courseBody}>
                  <View style={styles.courseMetaRow}>
                    <View style={styles.metaItem}>
                      <User size={14} color={theme.colors.textSecondary} />
                      <Text
                        style={[styles.metaText, typography.bodySm, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {course.instructorName || 'Faculty Instructor'}
                      </Text>
                    </View>

                    {course.room ? (
                      <View style={styles.metaItem}>
                        <MapPin size={14} color={theme.colors.textSecondary} />
                        <Text
                          style={[styles.metaText, typography.bodySm, { color: theme.colors.textSecondary }]}
                        >
                          {'Room ' + course.room}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.courseFooter, { borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.viewClassworkText, { color: theme.colors.primary }]}>
                      View Classwork & Stream
                    </Text>
                    <ChevronRight size={16} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 4. Urgent Deadlines Feed */}
        {!isProfessor && (
          <View style={styles.dueSoonContainer}>
            <View style={styles.dueSoonHeaderRow}>
              <View style={styles.dueSoonTitleGroup}>
                <Clock size={16} color="#EF4444" />
                <Text style={[styles.dueSoonHeading, typography.headingSm, { color: theme.colors.text }]}>
                  Urgent Deadlines
                </Text>
                {dueSoon.length > 0 && (
                  <View style={styles.dueSoonCountBadge}>
                    <Text style={styles.dueSoonCountText}>{dueSoon.length}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/' + instituteCode + '/assignments' as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>View To-do</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <SkeletonLoader height={70} borderRadius={12} />
            ) : dueSoon.length === 0 ? (
              <View
                style={[
                  styles.emptyDueCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <Sparkles size={20} color={theme.colors.primary} />
                <Text style={[styles.emptyDueTitle, { color: theme.colors.text }]}>All Caught Up!</Text>
                <Text style={[styles.emptyDueSub, { color: theme.colors.textSecondary }]}>
                  No urgent assignments due in the next 7 days.
                </Text>
              </View>
            ) : (
              <View style={styles.dueList}>
                {dueSoon.slice(0, 4).map((item) => {
                  const badge = getRelativeDueBadge(item.dueDate);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.dueItemCard,
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push(
                          '/(tabs)/' + instituteCode + '/courses/' + item.courseId as any
                        )
                      }
                    >
                      <View style={styles.dueItemLeft}>
                        <View
                          style={[
                            styles.dueIconBox,
                            { backgroundColor: theme.colors.primary + '18' },
                          ]}
                        >
                          <ClipboardList size={16} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.dueItemTitle, typography.bodyMd, { color: theme.colors.text }]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[styles.dueItemCourse, typography.bodySm, { color: theme.colors.textSecondary }]}
                          >
                            {item.courseCode || 'Classwork'}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.dueBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.dueBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGlowOverlay: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroContent: {
    zIndex: 1,
  },
  instituteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    gap: 5,
    marginBottom: 10,
  },
  instituteBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroGreeting: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
  },
  gamificationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  gamificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  gamificationText: {
    color: '#FFFFFF',
  },
  quickActionContainer: {
    marginTop: 16,
  },
  quickActionScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: TOUCH_TARGET,
  },
  quickActionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    marginLeft: 2,
  },
  quickActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    marginBottom: 1,
  },
  sectionSub: {
    fontSize: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  coursesStack: {
    paddingHorizontal: 16,
    gap: 14,
  },
  courseCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  courseHeader: {
    padding: 16,
  },
  courseBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  codePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionPillText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  courseTitle: {
    color: '#FFFFFF',
  },
  courseBody: {
    padding: 14,
  },
  courseMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
  },
  courseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  viewClassworkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginBottom: 4,
  },
  emptySub: {
    textAlign: 'center',
    lineHeight: 18,
  },
  dueSoonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  dueSoonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dueSoonTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueSoonHeading: {
    fontSize: 16,
  },
  dueSoonCountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  dueSoonCountText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dueList: {
    gap: 10,
  },
  dueItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  dueIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueItemTitle: {
    fontWeight: '600',
  },
  dueItemCourse: {
    fontSize: 11,
    marginTop: 1,
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyDueCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyDueTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyDueSub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
