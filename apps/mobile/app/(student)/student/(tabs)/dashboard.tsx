import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Zap,
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  Bell,
  Video,
  Radio,
  ExternalLink,
  CheckSquare,
  Layers,
  Trophy,
  MessageSquare,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { LoginRewardModal } from '../../../../src/components/gamification/LoginRewardModal';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Screen, ErrorBanner, SectionTitle } from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import { getCanonicalInstituteName } from '../../../../src/lib/theme';
import { formatGradePoint, computeGwaFromCourses } from '../../../../src/lib/ph-scale';
import { isIteUser, isIcsUser } from '../../../../src/lib/ite-eligibility';
import {
  getOnPrimaryColor,
  getInstituteGradients,
  useFloatingTabBarHeight,
} from '../../../../src/lib/design-system';
import { IteParticipationCard } from '../../../../src/components/institute/IteParticipationCard';
import { IteFocusCard } from '../../../../src/components/institute/IteFocusCard';
import { IteSuggestionsCard } from '../../../../src/components/institute/IteSuggestionsCard';
import { IcsKnowledgeExchangeCard } from '../../../../src/components/institute/IcsKnowledgeExchangeCard';
import type { Course, Announcement, TaskItem, Grade } from '@lms/types';
import type { ClassMeetingItem } from '@lms/api-client';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const rewardReceipt = useAuthStore((s) => s.rewardReceipt);
  const clearRewardReceipt = useAuthStore((s) => s.clearRewardReceipt);
  const theme = useTheme();
  const { contentPaddingBottom } = useFloatingTabBarHeight();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(rewardReceipt?.streak ?? 1);
  const [exp, setExp] = useState<number | null>(rewardReceipt?.expEarned ?? null);
  const [gwa, setGwa] = useState<string | null>(null);
  const [iteMeetings, setIteMeetings] = useState<ClassMeetingItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState(false);
  const [joiningMeetingId, setJoiningMeetingId] = useState<string | null>(null);

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
      const [cachedCourses, cachedAnnouncements, cachedTasks, cachedGrades, cachedSummaries] = await Promise.all([
        getCachedData<Course[]>('student_courses'),
        getCachedData<Announcement[]>('student_announcements'),
        getCachedData<TaskItem[]>('student_tasks'),
        getCachedData<Grade[]>('student_grades'),
        getCachedData<any[]>('student_grade_summaries'),
      ]);

      if (cachedCourses && cachedCourses.length > 0) setCourses(cachedCourses);
      if (cachedAnnouncements && cachedAnnouncements.length > 0) setAnnouncements(cachedAnnouncements);
      if (cachedTasks && cachedTasks.length > 0) setTasks(cachedTasks);
      if (cachedGrades && cachedGrades.length > 0) {
        const calculatedGwa = computeGwaFromCourses({
          summaries: cachedSummaries,
          grades: cachedGrades,
        });
        setGwa(formatGradePoint(calculatedGwa));
      }
      if (cachedCourses || cachedAnnouncements || cachedTasks) setLoading(false);

      const instituteCode = user?.institute?.code || 'ics';
      const [coursesRes, announcementsRes, tasksRes, heartbeatRes, gradesRes] = await Promise.allSettled([
        api.courses.list(instituteCode),
        api.announcements.list(instituteCode),
        api.workspace.getTasks(instituteCode),
        api.gamification.getHeartbeat(),
        api.grades.list(instituteCode),
      ]);

      // Only ITE accounts fetch meetings
      if (isIteUser(user)) {
        try {
          setMeetingsLoading(true);
          setMeetingsError(false);
          const meetingsRes = await api.meetings.list({ status: 'all', take: 5 });
          if (meetingsRes?.meetings) {
            setIteMeetings(meetingsRes.meetings);
          } else {
            setIteMeetings([]);
          }
        } catch {
          setMeetingsError(true);
        } finally {
          setMeetingsLoading(false);
        }
      } else {
        setMeetingsLoading(false);
      }

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

      if (gradesRes.status === 'fulfilled' && (gradesRes.value as any)?.grades) {
        const gradesList = (gradesRes.value as any).grades;
        const summariesList = (gradesRes.value as any).summary;
        if (Array.isArray(gradesList) && gradesList.length > 0) {
          const calculatedGwa = computeGwaFromCourses({
            summaries: summariesList,
            grades: gradesList,
          });
          setGwa(formatGradePoint(calculatedGwa));
          await setCachedData('student_grades', gradesList);
          if (summariesList) {
            await setCachedData('student_grade_summaries', summariesList);
          }
        } else {
          setGwa(null);
        }
      }

      if (heartbeatRes.status === 'fulfilled' && heartbeatRes.value) {
        const hbData = heartbeatRes.value as unknown as {
          profile?: { loginStreakCurrent?: number; currentStreak?: number; exp?: number };
          rewardReceipt?: { rewarded: boolean; streak: number; expEarned: number } | null;
        };
        const currentStreak = hbData.profile?.loginStreakCurrent ?? hbData.profile?.currentStreak ?? 1;
        setStreak(currentStreak);
        if (hbData.profile?.exp !== undefined && hbData.profile.exp !== null) {
          setExp(hbData.profile.exp);
        }
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
    setRefreshTrigger((prev) => prev + 1);
    loadData();
  };

  const handleClaimReward = () => {
    setShowRewardModal(false);
    clearRewardReceipt();
  };

  const handleJoinLiveMeeting = async (meeting: ClassMeetingItem) => {
    try {
      setJoiningMeetingId(meeting.id);
      const res = await api.meetings.join(meeting.id);
      const url = (res?.joinUrl || meeting.joinUrl || '').trim();
      if (!url || !url.toLowerCase().startsWith('https://')) {
        Alert.alert('Invalid Meeting Link', 'The meeting link must start with https://');
        return;
      }
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open Link', 'No app or browser available to open the meeting link.');
      }
    } catch {
      Alert.alert('Join Failed', 'Meetings are temporarily unavailable. Please try again later.');
    } finally {
      setJoiningMeetingId(null);
    }
  };

  const liveMeeting = isIteUser(user)
    ? iteMeetings.find((m) => m.derivedStatus === 'LIVE' || m.status === 'LIVE')
    : undefined;
  const nextMeeting =
    isIteUser(user) && !liveMeeting
      ? iteMeetings.find(
          (m) =>
            (m.derivedStatus === 'SCHEDULED' || m.status === 'SCHEDULED') &&
            m.derivedStatus !== 'LIVE'
        )
      : undefined;

  const pendingTasks = tasks.filter((t) => !t.completed);
  const gradients = getInstituteGradients(theme.colors.primary, theme.isDark, user?.institute?.code);
  const onPrimary = getOnPrimaryColor(theme);
  const heroTextColor = gradients.heroTextColor;

  // Quick action tiles for student (3 to 6 tiles depending on institute)
  const quickActionTiles = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      route: '/student/tasks',
      visible: true,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: Layers,
      route: '/student/flashcards',
      visible: true,
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      route: '/student/leaderboard',
      visible: true,
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Award,
      route: '/student/achievements',
      visible: true,
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Video,
      route: '/student/meetings',
      visible: isIteUser(user),
    },
    {
      id: 'knowledge-exchange',
      label: 'Q&A Forum',
      icon: MessageSquare,
      route: '/student/knowledge-exchange',
      visible: isIcsUser(user),
    },
  ].filter((tile) => tile.visible);

  return (
    <Screen
      scroll
      withTopInset
      contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPaddingBottom }]}
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

      {/* ── Compact Hero Card with Institute Gradient ── */}
      <LinearGradient
        colors={gradients.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroMain}>
          <View style={styles.heroTextCol}>
            <Text style={[styles.heroGreeting, { color: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.8)' }]}>
              WELCOME BACK,
            </Text>
            <Text style={[styles.heroUserName, { color: heroTextColor }]} numberOfLines={1}>
              {user?.name || 'Student'}
            </Text>
            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.canonicalBadge,
                  { backgroundColor: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.12)' : 'rgba(255, 255, 255, 0.22)' },
                ]}
              >
                <Text style={[styles.canonicalBadgeText, { color: heroTextColor }]}>
                  {getCanonicalInstituteName(user?.institute?.code, user?.institute?.name || theme.name)}
                </Text>
              </View>
              {user?.studentNumber && (
                <Text style={[styles.studentNumberText, { color: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.85)' }]}>
                  {user.studentNumber}
                </Text>
              )}
            </View>
          </View>

          {/* Real Streak & EXP Chips */}
          <View style={styles.chipsCol}>
            <View
              style={[
                styles.chip,
                { backgroundColor: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
              ]}
            >
              <Flame size={14} color={heroTextColor} />
              <Text style={[styles.chipText, { color: heroTextColor }]}>
                {streak}d
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
              ]}
            >
              <Zap size={14} color={heroTextColor} />
              <Text style={[styles.chipText, { color: heroTextColor }]}>
                {exp != null ? `${exp} EXP` : '—'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Action Grid Tiles (Evenly Stretched Last Row, Zero Overlap) ── */}
      <View style={styles.quickGridContainer}>
        <View style={styles.quickGrid}>
          {(() => {
            const totalTiles = quickActionTiles.length;
            const remainder = totalTiles % 3;

            return quickActionTiles.map((tile, index) => {
              const Icon = tile.icon;
              const isLastRow = remainder !== 0 && index >= totalTiles - remainder;
              const tileWidth = isLastRow
                ? remainder === 1
                  ? '100%'
                  : '48.5%'
                : '31.5%';
              const isFullWidth = tileWidth === '100%';

              return (
                <TouchableOpacity
                  key={tile.id}
                  style={[
                    styles.quickTile,
                    {
                      width: tileWidth,
                      backgroundColor: gradients.surfaceTint,
                      borderColor: gradients.borderTint,
                    },
                    isFullWidth && styles.quickTileFullWidth,
                  ]}
                  onPress={() => router.push(tile.route as any)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={tile.label}
                >
                  <View style={[styles.tileIconCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <Icon size={19} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                    {tile.label}
                  </Text>
                </TouchableOpacity>
              );
            });
          })()}
        </View>
      </View>

      {/* ── Compact Stats Row (In Normal Layout Flow Below Tiles) ── */}
      <View style={[styles.statsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.statCol}
          onPress={() => router.push('/student/courses')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Courses: ${courses.length}`}
        >
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>
            {courses.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Courses
          </Text>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={styles.statCol}
          onPress={() => router.push('/student/tasks' as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Pending Tasks: ${pendingTasks.length}`}
        >
          <Text style={[styles.statNumber, { color: pendingTasks.length > 0 ? theme.colors.warning : theme.colors.text }]}>
            {pendingTasks.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Pending Tasks
          </Text>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={styles.statCol}
          onPress={() => router.push('/student/grades')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`GWA: ${gwa != null ? gwa : 'Not calculated'}`}
        >
          <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
            {gwa != null ? gwa : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            GWA
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ITE Class Meetings Section (ITE only - All 5 States Render Visible Text) ── */}
      {isIteUser(user) && (
        <View style={styles.section}>
          <SectionTitle
            title="Class Meetings"
            actionText="View All"
            onActionPress={() => router.push('/student/meetings' as any)}
            actionAccessibilityLabel="View all class meetings"
          />

          {meetingsLoading ? (
            <View style={[styles.meetingCardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <View style={styles.meetingTextColumn}>
                <Text style={[styles.meetingTitleText, { color: theme.colors.text }]}>
                  Loading Class Meetings...
                </Text>
                <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]}>
                  Checking virtual classroom schedule
                </Text>
              </View>
            </View>
          ) : meetingsError ? (
            <View style={[styles.meetingCardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={[styles.meetingIconBox, { backgroundColor: `${theme.colors.warning}18` }]}>
                <AlertCircle size={20} color={theme.colors.warning} />
              </View>
              <View style={styles.meetingTextColumn}>
                <Text style={[styles.meetingTitleText, { color: theme.colors.text }]}>
                  Meetings are temporarily unavailable
                </Text>
                <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]}>
                  Could not load your meeting schedule
                </Text>
              </View>
              <TouchableOpacity
                onPress={loadData}
                style={[styles.retryBtn, { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading class meetings"
              >
                <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : liveMeeting ? (
            <View style={[styles.meetingCardBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.success, borderWidth: 1.5 }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Live meeting: ${liveMeeting.title}`}
                onPress={() => router.push('/student/meetings' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.meetingCardTop}>
                  <Badge label={liveMeeting.courseCode || 'ITE'} variant="primary" size="sm" />
                  <View style={[styles.livePill, { backgroundColor: `${theme.colors.danger}18` }]}>
                    <Radio size={12} color={theme.colors.danger} />
                    <Text style={[styles.livePillText, { color: theme.colors.danger }]}>
                      LIVE NOW
                    </Text>
                  </View>
                </View>
                <Text style={[styles.meetingTitleText, { color: theme.colors.text }]} numberOfLines={1}>
                  {liveMeeting.title}
                </Text>
                <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {liveMeeting.courseTitle}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Join Live Meeting"
                style={[styles.meetingJoinBtn, { backgroundColor: theme.colors.success }]}
                onPress={() => handleJoinLiveMeeting(liveMeeting)}
                disabled={joiningMeetingId === liveMeeting.id}
                activeOpacity={0.8}
              >
                {joiningMeetingId === liveMeeting.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Video size={16} color="#FFFFFF" />
                    <Text style={styles.meetingJoinBtnText}>Join Meeting</Text>
                    <ExternalLink size={14} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : nextMeeting ? (
            <TouchableOpacity
              style={[styles.meetingCardBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={`Upcoming meeting: ${nextMeeting.title}`}
              onPress={() => router.push('/student/meetings' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.meetingCardTop}>
                <Badge label={nextMeeting.courseCode || 'ITE'} variant="primary" size="sm" />
                <Badge label="UPCOMING" variant="info" size="sm" />
              </View>
              <Text style={[styles.meetingTitleText, { color: theme.colors.text }]} numberOfLines={1}>
                {nextMeeting.title}
              </Text>
              <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {nextMeeting.courseTitle}
              </Text>
              <View style={styles.meetingTimeRow}>
                <Clock size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.meetingTimeText, { color: theme.colors.textSecondary }]}>
                  {nextMeeting.scheduledAt
                    ? new Date(nextMeeting.scheduledAt).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Scheduled soon'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.meetingCardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="No upcoming meetings. Tap to view meetings."
              onPress={() => router.push('/student/meetings' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.meetingIconBox, { backgroundColor: `${theme.colors.primary}18` }]}>
                <Video size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.meetingTextColumn}>
                <Text style={[styles.meetingTitleText, { color: theme.colors.text }]} numberOfLines={1}>
                  No upcoming meetings
                </Text>
                <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  Tap to view your virtual classroom schedule
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── ITE Features: Suggestions, Focus Mode, Participation ── */}
      {isIteUser(user) && (
        <>
          <IteSuggestionsCard onRefreshTrigger={refreshTrigger} />
          <IteFocusCard onRefreshTrigger={refreshTrigger} />
          <IteParticipationCard onRefreshTrigger={refreshTrigger} />
        </>
      )}

      {/* ── ICS Features: Knowledge Exchange Discussion Feed ── */}
      {isIcsUser(user) && (
        <IcsKnowledgeExchangeCard onRefreshTrigger={refreshTrigger} />
      )}

      {/* ── Enrolled Courses Section (List-Style Rows with Chevrons) ── */}
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
              style={[styles.courseRowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push({ pathname: '/student/courses/[courseId]' as any, params: { courseId: course.id } })}
              activeOpacity={0.8}
            >
              <View style={[styles.courseCodeBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
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

      {/* ── Recent Announcements Section (List-Style Rows with Chevrons) ── */}
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
              style={[styles.announcementRowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push('/student/announcements' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.announcementTop}>
                <Badge label={item.courseCode || 'NOTICE'} variant="info" size="sm" />
                {item.createdAt && (
                  <Text style={[styles.announcementDate, { color: theme.colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <Text style={[styles.announcementTitle, { color: theme.colors.text }]} numberOfLines={1}>
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
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextCol: {
    flex: 1,
    marginRight: 10,
  },
  heroGreeting: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroUserName: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 5,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  canonicalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  canonicalBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  studentNumberText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  chipsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickGridContainer: {
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTile: {
    width: '31.5%',
    height: 88,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileFullWidth: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  section: {
    marginBottom: 16,
  },
  courseRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  courseCodeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseCodeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  courseInfo: {
    flex: 1,
    marginRight: 8,
  },
  courseItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  courseInstructorText: {
    fontSize: 12,
  },
  announcementRowCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  announcementTop: {
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
    fontSize: 12.5,
    lineHeight: 17,
  },
  meetingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  meetingCardBlock: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  meetingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  meetingTextColumn: {
    flex: 1,
    marginRight: 8,
  },
  meetingTitleText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  meetingDescText: {
    fontSize: 12,
  },
  meetingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meetingJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  meetingJoinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  meetingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  meetingTimeText: {
    fontSize: 11.5,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
