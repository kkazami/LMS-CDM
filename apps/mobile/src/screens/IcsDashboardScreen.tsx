import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart2, BookOpen, CheckSquare, ClipboardCheck, ClipboardList, Code2, Compass, Flame, GraduationCap, Plus, Share2, Sparkles, Trophy, UserCheck, Users } from 'lucide-react-native';
import type { MobileDashboard } from '@lms/types';
import { Screen, ErrorBanner, FormModal, SkeletonBlock } from '../components/ui';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { IcsHeader } from '../components/institute/IcsHeader';
import { IcsCalendar } from '../components/institute/IcsCalendar';
import { IcsCourseCard } from '../components/institute/IcsCourseCard';
import { LoginRewardModal } from '../components/gamification/LoginRewardModal';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { useFloatingTabBarHeight } from '../lib/design-system';
import { getCachedData, setCachedData } from '../lib/offline-storage';
import { markUsefulContent } from '../lib/performance';
import { dashboardErrorMessage } from '../lib/dashboard-error';

export function IcsDashboardScreen({ teacher = false, coursesOnly = false }: { teacher?: boolean; coursesOnly?: boolean }) {
  const theme = useTheme(), router = useRouter(), client = useQueryClient();
  const user = useAuthStore(s => s.user), api = useAuthStore(s => s.api);
  const reward = useAuthStore(s => s.rewardReceipt), clearReward = useAuthStore(s => s.clearRewardReceipt);
  const { contentPaddingBottom } = useFloatingTabBarHeight();
  const queryKey = ['ics-dashboard', user?.id, user?.institute.code];
  const query = useQuery({ queryKey, queryFn: async () => {
    const data = await api.mobileDashboard.get();
    void setCachedData('ics_dashboard', data);
    markUsefulContent('home');
    return data;
  }, retry: 1, staleTime: 20000 });
  useFocusEffect(useCallback(() => { void query.refetch(); }, [api, user?.id]));
  useEffect(() => {
    let active = true;
    void getCachedData<MobileDashboard>('ics_dashboard').then(data => {
      if (active && data && !client.getQueryData(queryKey)) client.setQueryData(queryKey, data);
    });
    return () => { active = false; };
  }, [client, user?.id]);
  const data = query.data, courses = data?.courses || [];
  const [queue, setQueue] = useState<'grading' | 'requests' | null>(null);
  const [joining, setJoining] = useState(false), [code, setCode] = useState(''), [joinBusy, setJoinBusy] = useState(false), [joinError, setJoinError] = useState('');
  const [notice, setNotice] = useState(''), [orderError, setOrderError] = useState(''), [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const ink = { color: theme.colors.text }, muted = { color: theme.colors.textSecondary };
  const surface = { backgroundColor: theme.colors.card, borderColor: theme.colors.border };
  const pendingWork = courses.reduce((sum, course) => sum + course.pendingWorkCount, 0);
  const requests = courses.reduce((sum, course) => sum + course.pendingCount, 0);
  const students = courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0);
  function navigate(path: string) { router.push(path as never); }
  async function move(index: number, direction: number) {
    if (!data || savingRef.current || index + direction < 0 || index + direction >= courses.length) return;
    savingRef.current = true; setSaving(true); setOrderError('');
    const ordered = [...courses];
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    client.setQueryData(queryKey, { ...data, courses: ordered });
    try {
      await api.mobileDashboard.reorder(ordered.map(course => course.id));
      void setCachedData('ics_dashboard', { ...data, courses: ordered });
    } catch { client.setQueryData(queryKey, data); setOrderError('Course order could not save. Your previous order has been restored.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function join() {
    if (!code.trim() || joinBusy) return;
    setJoinBusy(true); setJoinError('');
    try {
      await api.courses.joinWithCode(code.trim()); setJoining(false); setCode('');
      setNotice('Your class request was sent. Approved classes will appear here.');
      await query.refetch();
    } catch (error) { setJoinError(error instanceof Error ? error.message : 'Unable to join this class. Check the code and try again.'); }
    finally { setJoinBusy(false); }
  }
  const actions = teacher ? [
    { label: 'Add Class', description: 'Provision course', icon: Plus, press: () => navigate('/teacher/tools?tool=create-class'), badge: 0 },
    { label: 'To Grade', description: 'Pending submissions', icon: GraduationCap, press: () => setQueue('grading'), badge: pendingWork },
    { label: 'Requests', description: 'Jump to enrollment queue', icon: UserCheck, press: () => setQueue('requests'), badge: requests },
    { label: 'Analytics', description: 'At-risk telemetry', icon: BarChart2, press: () => navigate('/teacher/(tabs)/analytics'), badge: 0 },
    { label: 'Broadcast', description: 'Send notice', icon: Share2, press: () => navigate('/teacher/(tabs)/alerts'), badge: 0 },
    { label: 'CodeLab Hub', description: 'Lab workspace', icon: Compass, press: () => navigate('/teacher/codelab'), badge: 0 },
  ] : [
    { label: 'Join Class', description: 'Enter code', icon: Plus, press: () => { setJoinError(''); setJoining(true); }, badge: 0 },
    { label: 'Assignments', description: data?.overdue ? 'Overdue work' : 'Upcoming work', icon: ClipboardList, press: () => navigate('/student/assignments'), badge: data?.overdue || 0 },
    { label: 'Flashcards', description: 'Study decks', icon: Flame, press: () => navigate('/student/flashcards'), badge: 0 },
    { label: 'Study tasks', description: 'Your task list', icon: CheckSquare, press: () => navigate('/student/tasks'), badge: 0 },
    { label: 'CodeLab', description: 'Interactive labs', icon: Code2, press: () => navigate('/student/codelab'), badge: 0 },
    { label: 'Leaderboards', description: 'Top rankings', icon: Trophy, press: () => navigate('/student/leaderboard'), badge: 0 },
  ];
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <IcsHeader teacher={teacher} title={coursesOnly ? teacher ? 'My Classes' : 'My Courses' : undefined} />
    <Screen scroll contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} tintColor={theme.colors.primary} />}>
      {query.isError && <ErrorBanner message={dashboardErrorMessage(query.error, !!data)} onRetry={() => { void query.refetch(); }} />}
      {!!notice && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss class request confirmation" onPress={() => setNotice('')} style={[styles.notice, { backgroundColor: theme.colors.successBg }]}><Text accessibilityLiveRegion="polite" style={{ color: theme.colors.success }}>{notice}</Text></Pressable>}
      {!coursesOnly && <>
        <View style={[styles.welcome, surface]}>
          <View style={[styles.portal, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}><Sparkles size={14} color={theme.colors.textSecondary} /><Text style={[styles.portalText, muted]}>INSTITUTE OF COMPUTING STUDIES · {teacher ? 'FACULTY PORTAL' : 'PORTAL'}</Text></View>
          <Text accessibilityRole="header" style={[styles.greeting, ink]}>{teacher ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Professor.` : `A fresh day, a fresh idea, ${user?.name?.split(' ')[0] || 'Student'}.`}</Text>
          <Text style={[styles.copy, muted]}>{teacher ? 'Manage your assigned classes, syllabus, gradebook ledgers, and student enrollment requests.' : data ? `You have ${courses.length} active courses, ${data.overdue} overdue and ${data.dueSoon} due in the next 7 days.` : 'Loading your courses and upcoming work…'}</Text>
          {teacher && <View style={styles.stats}>{[
            { icon: BookOpen, label: `${data ? courses.length : '—'} Classes`, press: () => navigate('/teacher/(tabs)/courses') },
            { icon: Users, label: `${data ? students : '—'} Students`, press: () => navigate('/teacher/(tabs)/analytics') },
            { icon: UserCheck, label: `${data ? requests : '—'} Requests`, press: () => setQueue('requests') },
            { icon: ClipboardCheck, label: `${data ? pendingWork : '—'} to Grade`, press: () => setQueue('grading') },
          ].map(item => <Pressable key={item.label} accessibilityRole="button" onPress={item.press} style={[styles.stat, { backgroundColor: theme.isDark ? '#382419' : '#FFF4ED', borderColor: theme.isDark ? '#724426' : '#FED7AA' }]}><item.icon size={14} color={accent} /><Text style={{ color: accent, fontSize: 13 }}>{item.label}</Text></Pressable>)}</View>}
        </View>
        {teacher && <Text style={[styles.sectionLabel, muted]}>INSTRUCTION CONTROLS</Text>}
        <View style={styles.actionGrid}>{actions.map((item, index) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.press} style={({ pressed }) => [styles.action, surface, pressed && { backgroundColor: theme.colors.cardSecondary }]}>
          <View style={[styles.actionIcon, { backgroundColor: theme.isDark ? '#382419' : teacher ? ['#FFF4ED', '#EFF6FF', '#FFF7ED', '#F5F3FF', '#FFF1F2', '#ECFEFF'][index] : '#FFF4ED' }]}><item.icon size={17} strokeWidth={1.7} color={accent} /></View>
          {item.badge > 0 && <View style={[styles.actionBadge, { backgroundColor: teacher ? theme.colors.warningBg : theme.isDark ? '#4A2030' : '#FFE4E6' }]}><Text style={{ fontSize: 12, color: teacher ? theme.colors.warning : theme.isDark ? '#FDA4AF' : '#BE123C' }}>{item.badge}{teacher && item.label === 'To Grade' ? ' Due' : ''}</Text></View>}
          <Text style={[styles.actionLabel, ink]}>{item.label}</Text><Text style={[styles.actionDescription, muted]}>{item.description}</Text>
        </Pressable>)}</View>
        {data ? <IcsCalendar calendar={data.calendar} teacher={teacher} /> : query.isPending ? <SkeletonBlock height={360} width="100%" style={{ marginBottom: 24 }} /> : null}
      </>}
      <View style={styles.courseHeading}>
        <View style={[styles.headingIcon, { backgroundColor: theme.isDark ? '#382419' : '#FFF4ED' }]}><GraduationCap size={21} color={accent} /></View>
        <View style={{ flex: 1 }}><Text accessibilityRole="header" style={[styles.sectionTitle, ink]}>{teacher ? 'My Classes' : 'My Courses'}</Text><Text style={[styles.copy, muted]}>{teacher ? 'Classes assigned for your instruction' : 'Continue learning in your enrolled courses'}</Text></View>
        {data && <Text style={[styles.count, { color: accent, backgroundColor: theme.isDark ? '#382419' : '#FFF4ED' }]}>{courses.length} {teacher ? 'Classes' : 'Courses'}</Text>}
      </View>
      {courses.length > 1 && <Text style={[styles.reorderHint, muted]}>{saving ? 'Saving course order…' : 'Use the arrow buttons to reorder · changes are saved automatically'}</Text>}
      {!!orderError && <ErrorBanner message={orderError} onDismiss={() => setOrderError('')} />}
      {query.isPending ? <View style={{ gap: 16 }}><SkeletonBlock height={240} width="100%" /><SkeletonBlock height={240} width="100%" /></View> : !courses.length && !query.isError ? <View style={[styles.empty, surface]}><BookOpen size={30} color={theme.colors.textSecondary} /><Text style={[styles.sectionTitle, ink]}>{teacher ? 'No classes assigned yet' : 'Your courses will appear here'}</Text><Text style={[styles.copy, muted]}>{teacher ? 'Create a class to start managing coursework.' : 'Join a class using the code from your instructor.'}</Text><Button title={teacher ? 'Add Class' : 'Join Class'} onPress={actions[0].press} /></View> : courses.map((course, index) => <IcsCourseCard key={course.id} course={course} teacher={teacher} index={index} count={courses.length} saving={saving} onMove={(from, direction) => { void move(from, direction); }} />)}
    </Screen>
    <FormModal visible={!!queue} onClose={() => setQueue(null)} title={queue === 'grading' ? 'To Grade' : 'Enrollment requests'}>
      {!data && (query.isPending ? <ActivityIndicator accessibilityLabel="Loading classes" color={theme.colors.primary} /> : <ErrorBanner message="Your classes could not load. Please retry." onRetry={() => { void query.refetch(); }} />)}
      {courses.filter(course => queue === 'grading' ? course.pendingWorkCount > 0 : course.pendingCount > 0).map(course => <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={`Open ${queue === 'grading' ? 'gradebook' : 'enrollment requests'} for ${course.title}`} onPress={() => { const tab = queue === 'grading' ? 'GRADEBOOK' : 'PEOPLE'; setQueue(null); navigate(`/teacher/courses/${course.id}?initialTab=${tab}`); }} style={[styles.queueItem, { borderColor: theme.colors.border }]}><Text style={[styles.actionLabel, ink]}>{course.title}</Text><Text style={[styles.copy, muted]}>{queue === 'grading' ? `${course.pendingWorkCount} submissions to grade` : `${course.pendingCount} enrollment requests`}</Text></Pressable>)}
      {data && (queue === 'grading' ? pendingWork : requests) === 0 && <Text style={[styles.copy, muted]}>{queue === 'grading' ? 'All caught up. There are no submissions waiting for a grade.' : 'No enrollment requests are waiting for your review.'}</Text>}
    </FormModal>
    <FormModal visible={joining} onClose={() => { if (!joinBusy) setJoining(false); }} title="Join Class" subtitle="Enter the class code shared by your instructor." actions={<Button title="Join Class" onPress={() => { void join(); }} loading={joinBusy} disabled={joinBusy || !code.trim()} />}>
      <Input label="Class code" value={code} onChangeText={setCode} editable={!joinBusy} autoCapitalize="characters" autoCorrect={false} maxLength={32} error={joinError} />
    </FormModal>
    {!teacher && <LoginRewardModal visible={!!reward?.rewarded} streak={reward?.streak || 0} expEarned={reward?.expEarned || 0} onClaim={clearReward} />}
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 14 },
  welcome: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24 },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 20, alignSelf: 'flex-start' },
  portalText: { fontSize: 11, lineHeight: 17, fontWeight: '700', letterSpacing: 0.4, flexShrink: 1 },
  greeting: { fontSize: 20, lineHeight: 28, fontWeight: '700', marginTop: 10, marginBottom: 8, letterSpacing: -0.4 },
  copy: { fontSize: 13, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, minHeight: 36, borderRadius: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.7, marginTop: 8, marginBottom: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  action: { width: '48%', flexGrow: 1, flexBasis: '46%', minHeight: 106, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  actionIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  actionDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  actionBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  courseHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  headingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  count: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, fontSize: 12 },
  reorderHint: { fontSize: 13, lineHeight: 20, marginBottom: 18 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  queueItem: { paddingVertical: 16, borderBottomWidth: 1, gap: 6 },
  notice: { borderRadius: 12, padding: 16, marginBottom: 16 },
});
