import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  CheckSquare,
  Flame,
  Zap,
  Award,
  Trophy,
  Layers,
  Plus,
  ClipboardList,
  Bell,
  ChevronRight,
  Sparkles,
  BarChart2,
  UserCheck,
  GraduationCap,
} from 'lucide-react-native';
import type { Course, Announcement, TaskItem } from '@lms/types';
import { Text } from '../components/ui/Text';
import { ErrorBanner, FormModal, SkeletonBlock } from '../components/ui';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { IbeHeader } from '../components/institute/IbeHeader';
import { IbeCourseCard } from '../components/institute/IbeCourseCard';
import { IbeStudentProgramSection } from '../components/institute/IbeStudentProgramSection';
import { LoginRewardModal } from '../components/gamification/LoginRewardModal';
import { SurfacePressable } from '../components/motion/SurfacePressable';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useFloatingTabBarHeight } from '../lib/design-system';
import { getCachedData, setCachedData } from '../lib/offline-storage';
import { formatGradePoint, computeGwaFromCourses } from '../lib/ph-scale';
import { isBsbaHrmUser, isBsEntrepUser } from '../lib/ite-eligibility';

export function IbeDashboardScreen({
  teacher = false,
  coursesOnly = false,
}: {
  teacher?: boolean;
  coursesOnly?: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore(s => s.user);
  const api = useAuthStore(s => s.api);
  const rewardReceipt = useAuthStore(s => s.rewardReceipt);
  const clearRewardReceipt = useAuthStore(s => s.clearRewardReceipt);
  const { contentPaddingBottom } = useFloatingTabBarHeight();

  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [streak, setStreak] = useState<number>(rewardReceipt?.streak ?? 1);
  const [exp, setExp] = useState<number | null>(rewardReceipt?.expEarned ?? null);
  const [gwa, setGwa] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const savingRef = useRef(false);

  const isTeacher = teacher || ['PROFESSOR', 'TEACHER', 'INSTRUCTOR'].includes((user?.role || '').toUpperCase());
  const isEntrep = isBsEntrepUser(user);
  const isHrm = isBsbaHrmUser(user);
  const programLabel = isEntrep ? 'BS Entrepreneurship' : isHrm ? 'BSBA HRM' : 'Business & Entrepreneurship';

  const goldAccent = theme.isDark ? '#FFAE19' : '#B8860B';
  const goldBg = theme.isDark ? '#3D2A08' : '#FFF9E6';
  const goldBorder = theme.isDark ? '#6B4C0A' : '#F3D580';

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Offline cache hydrate first
      const [cachedCourses, cachedAnnouncements, cachedTasks, cachedGrades] = await Promise.all([
        getCachedData<Course[]>('student_courses'),
        getCachedData<Announcement[]>('student_announcements'),
        getCachedData<TaskItem[]>('student_tasks'),
        getCachedData<any[]>('student_grades'),
      ]);

      if (cachedCourses && cachedCourses.length > 0) {
        setCourses(cachedCourses);
        setLoading(false);
      }
      if (cachedAnnouncements) setAnnouncements(cachedAnnouncements);
      if (cachedTasks) setTasks(cachedTasks);

      const instituteCode = 'ibe';
      const [coursesRes, announcementsRes, tasksRes, heartbeatRes, gradesRes] = await Promise.allSettled([
        api.courses.list(instituteCode),
        api.announcements.list(instituteCode),
        api.workspace.getTasks(instituteCode),
        api.gamification.getHeartbeat(),
        api.grades.list(instituteCode),
      ]);

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
        await setCachedData('student_courses', coursesRes.value.courses);
      }

      if (announcementsRes.status === 'fulfilled' && announcementsRes.value?.announcements) {
        setAnnouncements(announcementsRes.value.announcements);
        await setCachedData('student_announcements', announcementsRes.value.announcements);
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value?.tasks) {
        setTasks(tasksRes.value.tasks);
        await setCachedData('student_tasks', tasksRes.value.tasks);
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
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not refresh campus updates. Showing offline data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReorder = async (index: number, direction: number) => {
    if (savingRef.current || index + direction < 0 || index + direction >= courses.length) return;
    savingRef.current = true;
    setSavingOrder(true);
    const ordered = [...courses];
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    setCourses(ordered);
    try {
      await setCachedData('student_courses', ordered);
    } catch {
      // Revert if saving fails
      setCourses(courses);
    } finally {
      savingRef.current = false;
      setSavingOrder(false);
    }
  };

  const handleJoinClass = async () => {
    if (!code.trim() || joinBusy) return;
    setJoinBusy(true);
    setJoinError('');
    try {
      await api.courses.joinWithCode(code.trim());
      setJoining(false);
      setCode('');
      setNotice('Your enrollment request has been submitted for approval.');
      await loadData();
    } catch (err: any) {
      setJoinError(err?.message || 'Unable to join class. Verify the code and try again.');
    } finally {
      setJoinBusy(false);
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed);

  const quickActions = [
    {
      label: 'Join Class',
      desc: 'Enter invite code',
      icon: Plus,
      press: () => { setJoinError(''); setJoining(true); },
    },
    {
      label: 'Assignments',
      desc: pendingTasks.length > 0 ? `${pendingTasks.length} pending tasks` : 'All caught up',
      icon: ClipboardList,
      press: () => router.push('/student/assignments' as never),
    },
    {
      label: 'Study Decks',
      desc: 'Flashcard mastery',
      icon: Layers,
      press: () => router.push('/student/flashcards' as never),
    },
    {
      label: 'Leaderboard',
      desc: 'Top academic ranks',
      icon: Trophy,
      press: () => router.push('/student/leaderboard' as never),
    },
    {
      label: 'Achievements',
      desc: 'Badges and honors',
      icon: Award,
      press: () => router.push('/student/achievements' as never),
    },
    {
      label: 'Campus Bulletins',
      desc: `${announcements.length} updates`,
      icon: Bell,
      press: () => router.push('/student/announcements' as never),
    },
  ];

  const teacherQuickActions = [
    {
      label: 'Add Class',
      desc: 'Create new class',
      icon: Plus,
      press: () => { setJoinError(''); setJoining(true); },
    },
    {
      label: 'Attendance',
      desc: 'Session attendance',
      icon: UserCheck,
      press: () => router.push('/teacher/attendance' as never),
    },
    {
      label: 'Class Analytics',
      desc: 'Student metrics',
      icon: BarChart2,
      press: () => router.push('/teacher/analytics' as never),
    },
    {
      label: 'Study Decks',
      desc: 'Course flashcards',
      icon: Layers,
      press: () => router.push('/teacher/flashcards' as never),
    },
    {
      label: 'Leaderboard',
      desc: 'Academic rankings',
      icon: Trophy,
      press: () => router.push('/teacher/leaderboard' as never),
    },
    {
      label: 'Campus Bulletins',
      desc: `${announcements.length} updates`,
      icon: Bell,
      press: () => router.push('/teacher/announcements' as never),
    },
  ];

  const actionsToRender = teacher ? teacherQuickActions : quickActions;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <IbeHeader teacher={teacher} title={coursesOnly ? (teacher ? 'My Classes' : 'My Courses') : undefined} />

      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={goldAccent}
            colors={[goldAccent]}
          />
        }
        ListHeaderComponent={
          <>
            {!!errorMessage && (
              <ErrorBanner
                message={errorMessage}
                onRetry={loadData}
                onDismiss={() => setErrorMessage(null)}
              />
            )}
            {!!notice && (
              <SurfacePressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss confirmation"
                onPress={() => setNotice('')}
                style={[styles.noticeBox, { backgroundColor: theme.colors.successBg }]}
              >
                <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>{notice}</Text>
              </SurfacePressable>
            )}

            {!coursesOnly && (
              <>
                {/* ── Overview Hero Card ── */}
                <View style={[styles.heroCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={styles.heroTopRow}>
                    <View style={[styles.programBadge, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                      {teacher ? <GraduationCap size={12} color={goldAccent} /> : <Sparkles size={12} color={goldAccent} />}
                      <Text style={[styles.programBadgeText, { color: goldAccent }]}>
                        {teacher ? 'IBE FACULTY' : programLabel.toUpperCase()}
                      </Text>
                    </View>
                    {!teacher && (
                      <View style={styles.chipsRow}>
                        <View style={[styles.chip, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                          <Flame size={13} color={goldAccent} />
                          <Text style={[styles.chipText, { color: goldAccent }]}>{streak}d streak</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                          <Zap size={13} color={goldAccent} />
                          <Text style={[styles.chipText, { color: goldAccent }]}>{exp != null ? `${exp} EXP` : '—'}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.greeting, { color: theme.colors.text }]}>
                    {teacher
                      ? `Welcome, Professor ${user?.name?.split(' ')[0] || 'Faculty'}.`
                      : `A fresh day, ${user?.name?.split(' ')[0] || 'Scholar'}.`}
                  </Text>
                  <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>
                    {teacher
                      ? `${courses.length} active classes · ${announcements.length} campus bulletins`
                      : `${courses.length} enrolled subjects · ${pendingTasks.length} pending tasks · GWA: ${gwa || '—'}`}
                  </Text>

                  {/* Compact Stats Row */}
                  <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
                    <TouchableOpacity
                      style={styles.statCol}
                      onPress={() => router.push((teacher ? '/teacher/courses' : '/student/courses') as never)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statVal, { color: theme.colors.text }]}>{courses.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                        {teacher ? 'Classes' : 'Courses'}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <TouchableOpacity
                      style={styles.statCol}
                      onPress={() => router.push((teacher ? '/teacher/analytics' : '/student/assignments') as never)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statVal, { color: (!teacher && pendingTasks.length > 0) ? theme.colors.warning : theme.colors.text }]}>
                        {teacher ? 'Metrics' : pendingTasks.length}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                        {teacher ? 'Analytics' : 'Tasks'}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <TouchableOpacity
                      style={styles.statCol}
                      onPress={() => router.push((teacher ? '/teacher/announcements' : '/student/grades') as never)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statVal, { color: goldAccent }]}>
                        {teacher ? announcements.length : (gwa || '—')}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                        {teacher ? 'Bulletins' : 'GWA'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Up Next Coursework (Students Only) ── */}
                {!teacher && pendingTasks.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={[styles.sectionHeading, { color: theme.colors.text, marginBottom: 0 }]}>
                        Up Next
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push('/student/assignments' as never)}
                        style={styles.viewAllBtn}
                        accessibilityRole="button"
                        accessibilityLabel="View all assignments"
                      >
                        <Text style={{ color: goldAccent, fontSize: 13, fontWeight: '700' }}>
                          View all
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.upNextCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      {pendingTasks.slice(0, 3).map((task, idx) => (
                        <TouchableOpacity
                          key={task.id}
                          style={[
                            styles.upNextRow,
                            idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                          ]}
                          onPress={() => router.push('/student/assignments' as never)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.taskIconBox, { backgroundColor: goldBg }]}>
                            <ClipboardList size={18} color={goldAccent} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>
                              {task.title}
                            </Text>
                            {task.dueDate && (
                              <Text style={[styles.taskDue, { color: goldAccent }]}>
                                Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </Text>
                            )}
                          </View>
                          <ChevronRight size={17} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Specialized Program Section (BS ENTREP or BSBA HRM - Students Only) ── */}
                {!teacher && <IbeStudentProgramSection />}

                {/* ── Shortcuts Action Grid ── */}
                <Text style={[styles.sectionHeading, { color: theme.colors.text, marginTop: 8 }]}>
                  {teacher ? 'Faculty Suite' : 'Learning Shortcuts'}
                </Text>
                <View style={styles.actionGrid}>
                  {actionsToRender.map(action => (
                    <SurfacePressable
                      key={action.label}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      accessibilityHint={action.desc}
                      onPress={action.press}
                      style={[styles.actionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                        <action.icon size={19} color={goldAccent} />
                      </View>
                      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{action.label}</Text>
                      <Text style={[styles.actionDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {action.desc}
                      </Text>
                    </SurfacePressable>
                  ))}
                </View>
              </>
            )}

            {/* ── Courses Section Header ── */}
            <View style={styles.courseHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  {teacher ? 'My Classes' : 'My Courses'}
                </Text>
                <Text style={[styles.courseSub, { color: theme.colors.textSecondary }]}>
                  {teacher ? 'Manage enrolled students and coursework.' : 'Pick up where you left off.'}
                </Text>
              </View>
              <Text style={[styles.courseCountBadge, { color: goldAccent, backgroundColor: goldBg, borderColor: goldBorder }]}>
                {courses.length}
              </Text>
            </View>

            {courses.length > 1 && (
              <Text style={[styles.reorderHint, { color: theme.colors.textSecondary }]}>
                {savingOrder ? 'Saving order…' : 'Arrange your subjects with the arrow buttons.'}
              </Text>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <IbeCourseCard
            course={item}
            teacher={isTeacher}
            index={index}
            count={courses.length}
            saving={savingOrder}
            onMove={handleReorder}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 14 }}>
              <SkeletonBlock height={140} width="100%" />
              <SkeletonBlock height={140} width="100%" />
            </View>
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <BookOpen size={32} color={goldAccent} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {isTeacher ? 'No classes assigned yet' : 'Your courses will appear here'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                {teacher ? 'Create a class to start coursework.' : 'Join a class using the code from your instructor.'}
              </Text>
              <Button
                title={teacher ? 'Add Class' : 'Join Class'}
                onPress={() => { setJoinError(''); setJoining(true); }}
              />
            </View>
          )
        }
        ListFooterComponent={
          !coursesOnly && announcements.length > 0 ? (
            <View style={styles.announcementsSection}>
              <View style={styles.announcementHeader}>
                <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>
                  Campus Bulletins & Notices
                </Text>
                <TouchableOpacity onPress={() => router.push('/student/announcements' as never)}>
                  <Text style={[styles.seeAllText, { color: goldAccent }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {announcements.slice(0, 2).map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.announcementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => router.push('/student/announcements' as never)}
                  activeOpacity={0.85}
                >
                  <View style={styles.announcementTop}>
                    <View style={[styles.bulletinBadge, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                      <Text style={[styles.bulletinBadgeText, { color: goldAccent }]}>
                        {item.courseCode || 'IBE BULLETIN'}
                      </Text>
                    </View>
                    {item.createdAt && (
                      <Text style={[styles.bulletinDate, { color: theme.colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.bulletinTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.bulletinBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {item.content}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : undefined
        }
      />

      {/* Join Class Modal */}
      <FormModal
        visible={joining}
        onClose={() => { if (!joinBusy) setJoining(false); }}
        title="Join Class"
        subtitle="Enter the 6-character class code provided by your instructor."
        actions={
          <Button
            title="Join Class"
            onPress={handleJoinClass}
            loading={joinBusy}
            disabled={joinBusy || !code.trim()}
          />
        }
      >
        <Input
          label="Class Code"
          value={code}
          onChangeText={setCode}
          editable={!joinBusy}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={32}
          error={joinError}
        />
      </FormModal>

      {!teacher && (
        <LoginRewardModal
          visible={!!rewardReceipt?.rewarded}
          streak={rewardReceipt?.streak || 0}
          expEarned={rewardReceipt?.expEarned || 0}
          onClaim={clearRewardReceipt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  programBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  programBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 102,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  courseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  courseSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  courseCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  reorderHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 6,
  },
  noticeBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  announcementsSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  announcementCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  announcementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bulletinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  bulletinBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bulletinDate: {
    fontSize: 11,
  },
  bulletinTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletinBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  upNextCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  taskIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  taskDue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});

