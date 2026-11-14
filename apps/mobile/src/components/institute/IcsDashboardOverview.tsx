import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BookOpen, ChevronRight, ClipboardCheck, Clock, UserCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { MobileDashboard } from '@lms/types';
import { Text } from '../ui/Text';
import { SurfacePressable } from '../motion/SurfacePressable';
import { FadeInView } from '../motion/FadeInView';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth-store';
import { useMobilePresentation } from '../presentation/MobilePresentation';
import { icsPresentation } from '../../lib/mobile-presentation';
import { studentNotificationRoute } from '../../lib/student-navigation';
import { schoolDateKey, schoolTime } from '../../lib/ics-calendar';

export function IcsDashboardOverview({ teacher, data, onQueue }: {
  teacher: boolean; data?: MobileDashboard; onQueue: (queue: 'grading' | 'requests') => void;
}) {
  const theme = useTheme(), router = useRouter();
  const name = useAuthStore(s => s.user?.name?.split(' ')[0]) || 'Student';
  const { fontScale } = useWindowDimensions();
  const { fontsReady } = useMobilePresentation();
  const accent = icsPresentation.accent[theme.isDark ? 'dark' : 'light'];
  const tint = icsPresentation.tint[theme.isDark ? 'dark' : 'light'];
  const ink = { color: theme.colors.text }, muted = { color: theme.colors.textSecondary };
  const courses = data?.courses || [];
  const pending = courses.reduce((sum, c) => sum + c.pendingWorkCount, 0);
  const requests = courses.reduce((sum, c) => sum + c.pendingCount, 0);
  const compact = fontScale > 1.3;
  const greeting = teacher ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Professor.` : `A fresh day, ${name}.`;
  return <View>
    <FadeInView duration={220} translateY={6}>
      <View style={styles.welcome}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={compact ? undefined : 1.3}
          style={[styles.greeting, ink, !compact && fontsReady && { fontFamily: 'DMSerifDisplay-Regular', fontWeight: '400' }, compact && styles.compactGreeting]}>{greeting}</Text>
        {!compact && !teacher && <Text style={[styles.welcomeLine, { color: accent }]}>Make room for learning.</Text>}
        <Text style={[styles.summary, muted]}>{data
          ? teacher ? `${courses.length} classes · ${courses.reduce((n, c) => n + (c.enrolledCount || 0), 0)} students`
            : `${courses.length} courses · ${data.overdue} overdue · ${data.dueSoon} due soon`
          : 'Loading your learning space…'}</Text>
      </View>
    </FadeInView>
    {teacher ? <>
      <Text accessibilityRole="header" style={[styles.heading, ink]}>Needs your attention</Text>
      <View style={[styles.group, { backgroundColor: theme.colors.card }]}>
        {[{ label: 'To Grade', value: pending, copy: 'submissions to grade', icon: ClipboardCheck, queue: 'grading' as const },
          { label: 'Requests', value: requests, copy: 'enrollment requests', icon: UserCheck, queue: 'requests' as const }].map((item, index) => <SurfacePressable
          key={item.queue} testID={`ics-queue-${item.queue}`} accessibilityRole="button" accessibilityLabel={item.label}
          accessibilityHint={`Open ${data ? item.value : 'pending'} ${item.copy}`} disabled={!data} onPress={() => onQueue(item.queue)}
          style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
          <View style={[styles.icon, { backgroundColor: tint }]}><item.icon size={21} color={accent} accessible={false} /></View>
          <Text style={[styles.rowTitle, ink]}>{data ? item.value : '—'} {item.copy}</Text><ChevronRight color={theme.colors.textSecondary} size={18} accessible={false} />
        </SurfacePressable>)}
      </View>
    </> : data && data.pendingAssignments.length > 0 ? <>
      <View style={styles.sectionHeader}><Text accessibilityRole="header" style={[styles.heading, ink]}>Up next</Text>
        <SurfacePressable accessibilityRole="button" accessibilityLabel="View all assignments" onPress={() => router.push('/student/assignments')} style={styles.textAction}><Text style={{ color: accent, fontSize: 13, fontWeight: '600' }}>View all</Text></SurfacePressable></View>
      <View style={[styles.group, { backgroundColor: theme.colors.card }]}>
        {data.pendingAssignments.slice(0, 2).map((item, index) => <SurfacePressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open assignment ${item.title}`}
          onPress={() => { const path = studentNotificationRoute(item.deepLink, 'ics'); if (path) router.push(path as never); }}
          style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
          <View style={[styles.icon, { backgroundColor: tint }]}><BookOpen color={accent} size={21} accessible={false} /></View>
          <View style={styles.rowCopy}><Text style={[styles.rowTitle, ink]}>{item.title}</Text><Text style={[styles.detail, muted]}>{item.courseCode || item.courseTitle}</Text>
            <View style={styles.date}><Clock size={12} color={accent} accessible={false} /><Text style={[styles.detail, { color: accent }]}>{schoolDateKey(item.eventDate)} · {schoolTime(item.eventDate)}</Text></View>
          </View><ChevronRight color={theme.colors.textSecondary} size={18} accessible={false} />
        </SurfacePressable>)}
      </View>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  welcome: { paddingTop: 8, paddingBottom: 24 },
  greeting: { fontSize: 32, lineHeight: 39, letterSpacing: -0.6, fontWeight: '600' },
  compactGreeting: { fontSize: 21, lineHeight: 29 },
  welcomeLine: { fontSize: 17, lineHeight: 26, marginTop: 6 },
  summary: { fontSize: 13, lineHeight: 21, marginTop: 12 },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  textAction: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', marginTop: -12 },
  group: { borderRadius: 22, marginBottom: 28, paddingHorizontal: 16 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { flexShrink: 1, flex: 1, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  detail: { fontSize: 13, lineHeight: 20 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
});
