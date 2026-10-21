import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Flame,
  Zap,
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  Bell,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { LoginRewardModal } from '../../../../src/components/gamification/LoginRewardModal';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Screen, ErrorBanner, SectionTitle } from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import type { Course, Announcement, TaskItem } from '@lms/types';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const rewardReceipt = useAuthStore((s) => s.rewardReceipt);
  const clearRewardReceipt = useAuthStore((s) => s.clearRewardReceipt);
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(rewardReceipt?.streak ?? 1);

  // Daily reward modal visibility
  const [showRewardModal, setShowRewardModal] = useState(false);

  useEffect(() => {
    if (rewardReceipt && rewardReceipt.rewarded) {
      setShowRewardModal(true);
    }
  }, [rewardReceipt]);

  const loadData = async () => {
    try {
      setErrorMessage(null);
      // Load offline cache first
      const [cachedCourses, cachedAnnouncements, cachedTasks] = await Promise.all([
        getCachedData<Course[]>('student_courses'),
        getCachedData<Announcement[]>('student_announcements'),
        getCachedData<TaskItem[]>('student_tasks'),
      ]);

      if (cachedCourses && cachedCourses.length > 0) setCourses(cachedCourses);
      if (cachedAnnouncements && cachedAnnouncements.length > 0) setAnnouncements(cachedAnnouncements);
      if (cachedTasks && cachedTasks.length > 0) setTasks(cachedTasks);
      if (cachedCourses || cachedAnnouncements || cachedTasks) setLoading(false);

      const instituteCode = user?.institute?.code || 'ics';
      const [coursesRes, announcementsRes, tasksRes, heartbeatRes] = await Promise.allSettled([
        api.courses.list(instituteCode),
        api.announcements.list(instituteCode),
        api.workspace.getTasks(instituteCode),
        api.gamification.getHeartbeat(),
      ]);

      let fetchFailed = false;

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
        await setCachedData('student_courses', coursesRes.value.courses);
      } else if (coursesRes.status === 'rejected') {
        fetchFailed = true;
      }

      if (announcementsRes.status === 'fulfilled' && announcementsRes.value?.announcements) {
        setAnnouncements(announcementsRes.value.announcements);
        await setCachedData('student_announcements', announcementsRes.value.announcements);
      } else if (announcementsRes.status === 'rejected') {
        fetchFailed = true;
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value?.tasks) {
        setTasks(tasksRes.value.tasks);
        await setCachedData('student_tasks', tasksRes.value.tasks);
      } else if (tasksRes.status === 'rejected') {
        fetchFailed = true;
      }

      if (heartbeatRes.status === 'fulfilled' && heartbeatRes.value) {
        const hbData = heartbeatRes.value as unknown as {
          profile?: { loginStreakCurrent?: number; currentStreak?: number; exp?: number };
          rewardReceipt?: { rewarded: boolean; streak: number; expEarned: number } | null;
        };
        const currentStreak = hbData.profile?.loginStreakCurrent ?? hbData.profile?.currentStreak ?? 1;
        setStreak(currentStreak);
        if (hbData.rewardReceipt && hbData.rewardReceipt.rewarded) {
          setShowRewardModal(true);
        }
      }

      if (fetchFailed && (!cachedCourses || cachedCourses.length === 0)) {
        setErrorMessage('Could not synchronize latest campus updates. Showing cached data.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaimReward = () => {
    setShowRewardModal(false);
    clearRewardReceipt();
  };

  const pendingTasks = tasks.filter((t) => !t.completed);

  return (
    <Screen
      scroll
      withTopInset
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Daily Reward Modal */}
      <LoginRewardModal
        visible={showRewardModal}
        streak={streak}
        expEarned={rewardReceipt?.expEarned ?? 10}
        onClaim={handleClaimReward}
      />

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onRetry={loadData}
          onDismiss={() => setErrorMessage(null)}
          retryAccessibilityLabel="Retry loading dashboard"
        />
      )}
        {/* Top Header Card */}
        <View style={[styles.topHeader, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.welcomeLabel, { color: theme.colors.textSecondary }]}>
              WELCOME BACK,
            </Text>
            <Text style={[styles.studentName, { color: theme.colors.text }]}>
              {user?.name || 'Student'}
            </Text>
            <View style={styles.instituteBadgeRow}>
              <Badge
                label={user?.institute?.name || theme.name}
                variant="primary"
                size="sm"
              />
              {user?.studentNumber && (
                <Text style={[styles.studentIdText, { color: theme.colors.textSecondary }]}>
                  {user.studentNumber}
                </Text>
              )}
            </View>
          </View>

          {/* Quick Streak & EXP Pill */}
          <View style={[styles.statsPill, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
            <View style={styles.statItem}>
              <Flame size={16} color={theme.colors.warning} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {streak}d
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Zap size={16} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                EXP
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Hub Navigation Cards */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="My Courses"
            style={[styles.quickCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push('/student/courses')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
              <BookOpen size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickCardNumber, { color: theme.colors.text }]}>
              {courses.length}
            </Text>
            <Text style={[styles.quickCardTitle, { color: theme.colors.textSecondary }]}>
              Courses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tasks to complete"
            style={[styles.quickCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push('/student/more')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: `${theme.colors.warning}18` }]}>
              <Clock size={22} color={theme.colors.warning} />
            </View>
            <Text style={[styles.quickCardNumber, { color: theme.colors.text }]}>
              {pendingTasks.length}
            </Text>
            <Text style={[styles.quickCardTitle, { color: theme.colors.textSecondary }]}>
              Pending Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View Grades"
            style={[styles.quickCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => router.push('/student/grades')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: `${theme.colors.success}18` }]}>
              <Award size={22} color={theme.colors.success} />
            </View>
            <Text style={[styles.quickCardNumber, { color: theme.colors.text }]}>
              GPA
            </Text>
            <Text style={[styles.quickCardTitle, { color: theme.colors.textSecondary }]}>
              Grades
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enrolled Courses Section */}
        <View style={styles.section}>
          <SectionTitle
            title="Enrolled Courses"
            actionText={`See All (${courses.length})`}
            onActionPress={() => router.push('/student/courses')}
            actionAccessibilityLabel="See all enrolled courses"
          />

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : courses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <BookOpen size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Courses Enrolled Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Your enrolled subjects will appear here once faculty assigns them.
              </Text>
            </Card>
          ) : (
            courses.slice(0, 3).map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.courseItemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push({ pathname: '/student/courses/[courseId]' as any, params: { courseId: course.id } })}
                activeOpacity={0.8}
              >
                <View style={[styles.courseCodeBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <Text style={[styles.courseCodeText, { color: theme.colors.primary }]}>
                    {course.code || 'CRS'}
                  </Text>
                </View>
                <View style={styles.courseInfo}>
                  <Text style={[styles.courseItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <Text style={[styles.courseInstructorText, { color: theme.colors.textSecondary }]}>
                    {course.instructorName || 'Faculty Instructor'}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recent Announcements Section */}
        <View style={styles.section}>
          <SectionTitle
            title="Campus Bulletins & Announcements"
            actionText="View All"
            onActionPress={() => router.push('/student/announcements' as any)}
            actionAccessibilityLabel="View all announcements"
          />

          {announcements.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Bell size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Announcements
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Check back later for institute notices.
              </Text>
            </Card>
          ) : (
            announcements.slice(0, 2).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.announcementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => router.push('/student/announcements' as any)}
                activeOpacity={0.85}
              >
                <View style={styles.announcementHeader}>
                  <Badge label={item.courseCode || 'NOTICE'} variant="info" size="sm" />
                  {item.createdAt && (
                    <Text style={[styles.announcementDate, { color: theme.colors.textSecondary }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.announcementTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.announcementContent, { color: theme.colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.content}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topHeader: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  welcomeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 6,
  },
  instituteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 8,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCardNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  courseItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  courseCodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  courseCodeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  courseInfo: {
    flex: 1,
  },
  courseItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  courseInstructorText: {
    fontSize: 12,
  },
  announcementCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementDate: {
    fontSize: 11,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  announcementContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
});
