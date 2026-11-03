import React, { useEffect, useState } from 'react';
import { IcsDashboardScreen } from '../../../../src/screens/IcsDashboardScreen';
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
  BookOpen,
  Users,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  Send,
  GraduationCap,
  Video,
  Radio,
  ExternalLink,
  Clock,
  BarChart2,
  Bell,
  MessageSquare,
  Code2,
  FlaskConical,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { Screen, SectionTitle } from '../../../../src/components/ui';
import { getCanonicalInstituteName } from '../../../../src/lib/theme';
import { isIteUser, isIcsUser } from '../../../../src/lib/ite-eligibility';
import {
  getOnPrimaryColor,
  getInstituteGradients,
  useFloatingTabBarHeight,
} from '../../../../src/lib/design-system';
import { IteInstructorAtRiskCard } from '../../../../src/components/institute/IteInstructorAtRiskCard';
import { IcsKnowledgeExchangeCard } from '../../../../src/components/institute/IcsKnowledgeExchangeCard';
import type { Course } from '@lms/types';
import type { ClassMeetingItem } from '@lms/api-client';

export default function TeacherDashboardScreen() {
  const user = useAuthStore(s => s.user);
  return isIcsUser(user) ? <IcsDashboardScreen teacher /> : <TeacherDashboard />;
}

function TeacherDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { contentPaddingBottom } = useFloatingTabBarHeight();

  const [courses, setCourses] = useState<Course[]>([]);
  const [iteMeetings, setIteMeetings] = useState<ClassMeetingItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const [coursesRes] = await Promise.allSettled([
        api.courses.list(instituteCode),
      ]);
      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
      }

      // Fetch meetings only for ITE instructors
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
    } catch {
      // Graceful fallback
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

  // Estimate total students
  const totalStudents = courses.reduce((acc, c) => acc + (c.studentCount ?? c.enrolledCount ?? 0), 0);

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

  const gradients = getInstituteGradients(theme.colors.primary, theme.isDark, user?.institute?.code);
  const onPrimary = getOnPrimaryColor(theme);
  const heroTextColor = gradients.heroTextColor;

  // Quick action tiles for teacher (3 to 5 tiles depending on institute)
  const quickActionTiles = [
    {
      id: 'classes',
      label: 'Classes',
      icon: BookOpen,
      route: '/teacher/(tabs)/courses',
      visible: true,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart2,
      route: '/teacher/(tabs)/analytics',
      visible: true,
    },
    {
      id: 'broadcasts',
      label: 'Broadcasts',
      icon: Bell,
      route: '/teacher/(tabs)/alerts',
      visible: true,
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Video,
      route: '/teacher/meetings',
      visible: isIteUser(user),
    },
    {
      id: 'codelab', label: 'CodeLab', icon: Code2, route: '/teacher/codelab', visible: isIcsUser(user),
    },
    {
      id: 'practical-labs', label: 'Practical Labs', icon: FlaskConical, route: '/teacher/practical-labs', visible: isIcsUser(user),
    },
    {
      id: 'knowledge-exchange',
      label: 'Knowledge Exchange',
      icon: MessageSquare,
      route: '/teacher/knowledge-exchange',
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
              FACULTY PORTAL &bull; {user?.role || 'PROFESSOR'}
            </Text>
            <Text style={[styles.heroUserName, { color: heroTextColor }]} numberOfLines={1}>
              Prof. {user?.name || 'Faculty Member'}
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
            </View>
            <Text style={[styles.heroSummaryLine, { color: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)' }]}>
              {courses.length} Assigned Classes &bull; {totalStudents} Enrolled Students
            </Text>
          </View>

          <View
            style={[
              styles.avatarBox,
              { backgroundColor: heroTextColor === '#111827' ? 'rgba(17, 24, 39, 0.12)' : 'rgba(255, 255, 255, 0.2)' },
            ]}
          >
            <GraduationCap size={28} color={heroTextColor} />
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
          onPress={() => router.push('/teacher/(tabs)/courses')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Assigned Classes: ${courses.length}`}
        >
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>
            {courses.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Assigned Classes
          </Text>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={styles.statCol}
          onPress={() => router.push('/teacher/(tabs)/analytics')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Total Students: ${totalStudents}`}
        >
          <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
            {totalStudents}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Enrolled Students
          </Text>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={styles.statCol}
          onPress={() => router.push('/teacher/(tabs)/courses')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Active Classwork"
        >
          <Text style={[styles.statNumber, { color: theme.colors.success }]}>
            {courses.length > 0 ? 'Active' : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Classwork
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ITE Class Meetings Section (ITE only - All 5 States Render Visible Text) ── */}
      {isIteUser(user) && (
        <View style={styles.section}>
          <SectionTitle
            title="Class Meetings"
            actionText="Manage All"
            onActionPress={() => router.push('/teacher/meetings' as any)}
            actionAccessibilityLabel="Manage all class meetings"
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
            <View
              style={[
                styles.meetingCardBlock,
                {
                  borderColor: theme.colors.success,
                  borderWidth: 1.5,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Live meeting: ${liveMeeting.title}`}
                onPress={() => router.push('/teacher/meetings' as any)}
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

              {liveMeeting.joinUrl ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open Live Meeting Link"
                  style={[styles.meetingActionBtn, { backgroundColor: theme.colors.success }]}
                  onPress={() => {
                    const url = (liveMeeting.joinUrl || '').trim();
                    if (url && url.toLowerCase().startsWith('https://')) {
                      Linking.openURL(url).catch(() => {
                        Alert.alert('Unable to open link', 'Please check your browser.');
                      });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Video size={14} color="#FFFFFF" />
                  <Text style={styles.meetingActionBtnText}>Open Meeting Room</Text>
                  <ExternalLink size={12} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : nextMeeting ? (
            <TouchableOpacity
              style={[styles.meetingCardBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={`Upcoming meeting: ${nextMeeting.title}`}
              onPress={() => router.push('/teacher/meetings' as any)}
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
                <Clock size={12} color={theme.colors.textSecondary} />
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
              accessibilityLabel="No active meetings. Tap to schedule."
              onPress={() => router.push('/teacher/meetings' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.meetingIconBox, { backgroundColor: `${theme.colors.primary}18` }]}>
                <Video size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.meetingTextColumn}>
                <Text style={[styles.meetingTitleText, { color: theme.colors.text }]} numberOfLines={1}>
                  No upcoming meetings
                </Text>
                <Text style={[styles.meetingDescText, { color: theme.colors.textSecondary }]}>
                  Tap to schedule a virtual classroom session
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── ITE Features: At-Risk Students Monitor ── */}
      {isIteUser(user) && (
        <IteInstructorAtRiskCard onRefreshTrigger={refreshTrigger} />
      )}

      {/* ── ICS Features: Knowledge Exchange Discussion Feed ── */}
      {isIcsUser(user) && (
        <IcsKnowledgeExchangeCard onRefreshTrigger={refreshTrigger} />
      )}

      {/* ── Active Teaching Schedule (List-Style Rows with Chevrons) ── */}
      <View style={styles.section}>
        <SectionTitle
          title="My Teaching Schedule"
          actionText={`Manage All (${courses.length})`}
          onActionPress={() => router.push('/teacher/(tabs)/courses')}
          actionAccessibilityLabel="Manage all classes"
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
        ) : courses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={36} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Classes Assigned
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Assigned classes will appear here once configured in the curriculum.
            </Text>
          </Card>
        ) : (
          courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={[styles.courseRowCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push('/teacher/(tabs)/courses')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Class ${course.code}: ${course.title}`}
            >
              <View style={[styles.courseCodeBadge, { backgroundColor: `${theme.colors.primary}18` }]}>
                <Text style={[styles.courseCodeText, { color: theme.colors.primary }]}>
                  {course.code || 'CLS'}
                </Text>
              </View>

              <View style={styles.courseInfo}>
                <Text style={[styles.courseItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {course.title}
                </Text>
                <View style={styles.courseSubRow}>
                  <Users size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.courseStudentText, { color: theme.colors.textSecondary }]}>
                    {course.studentCount ?? course.enrolledCount ?? 0} Students
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={theme.colors.textSecondary} />
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
    marginBottom: 6,
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
  heroSummaryLine: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  courseSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseStudentText: {
    fontSize: 11.5,
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
  meetingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  meetingActionBtnText: {
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
