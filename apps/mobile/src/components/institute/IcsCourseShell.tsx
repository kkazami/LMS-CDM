import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, UserRound, type LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CourseDetail } from '@lms/types';
import { CourseCover } from './CourseCover';
import { IcsHeader } from './IcsHeader';
import { Text } from '../ui/Text';
import { SurfacePressable } from '../motion/SurfacePressable';
import { IcsCourseTabBar } from '../navigation/IcsTabBar';
import { MoreMenuDrawer } from '../navigation/MoreMenuDrawer';
import { ChatbotFAB } from '../chatbot/ChatbotFAB';
import { useTheme } from '../../hooks/useTheme';

export function IcsCourseShell({ title, onBack, teacher = false, children }: {
  title: string; onBack: () => void; teacher?: boolean; children: React.ReactNode;
}) {
  const theme = useTheme();
  return <MoreMenuDrawer role={teacher ? 'TEACHER' : 'STUDENT'}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <IcsHeader teacher={teacher} title={title} onBack={onBack} />
      {children}
      <IcsCourseTabBar teacher={teacher} />
      <ChatbotFAB />
    </View>
  </MoreMenuDrawer>;
}

export function IcsCourseBanner({ course, pendingWork, onPendingWork }: {
  course: CourseDetail; pendingWork?: number; onPendingWork?: () => void;
}) {
  const details = [
    { Icon: BookOpen, label: course.section },
    { Icon: MapPin, label: course.room },
    { Icon: UserRound, label: course.instructorName },
  ];
  return <View style={styles.banner} testID="course-page-header">
    <CourseCover value={course.coverImage || course.mobileCoverImage} style={StyleSheet.absoluteFill} fallback={null} />
    <LinearGradient colors={['#030809DC', '#060C1280', '#060C1233']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} aria-hidden />
    <Text accessibilityRole="header" style={styles.title}>{course.title}</Text>
    <Text style={styles.subtitle}>{[course.code, course.subject].filter(Boolean).join(' · ')}</Text>
    {!!course.courseCode && course.courseCode !== course.code && <Text style={styles.code}>{course.courseCode}</Text>}
    <View style={styles.metadata}>
      {details.map(({ Icon, label }) => label && <View key={label + Icon.displayName} style={styles.detail}><Icon color="#FFFFFF" size={13} /><Text style={styles.detailText}>{label}</Text></View>)}
    </View>
    {pendingWork !== undefined && (pendingWork > 0
      ? <SurfacePressable accessibilityRole="button" onPress={onPendingWork} style={[styles.status, { minHeight: 44 }]}>
          <ClipboardCheck color="#FCD34D" size={14} /><Text style={styles.detailText}>{pendingWork} Pending Work</Text>
        </SurfacePressable>
      : <View style={styles.status}><CheckCircle2 color="#6EE7B7" size={14} /><Text style={styles.detailText}>No Pending Work</Text></View>)}
  </View>;
}

export type IcsCourseTab<T extends string> = { id: T; label: string; Icon: LucideIcon; accessibilityLabel?: string };

export function IcsCourseNavigation<T extends string>({ tabs, active, onSelect, counts }: {
  tabs: IcsCourseTab<T>[]; active: T; onSelect: (tab: T) => void; counts?: Partial<Record<T, number>>;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [showLabels, setShowLabels] = useState(false);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const positions = useRef<Partial<Record<T, number>>>({});
  const index = tabs.findIndex(tab => tab.id === active);
  const canToggle = width < tabs.length * 112;
  const labeled = !canToggle || showLabels;
  const scrollWidth = width - (canToggle ? 44 : 0);
  useEffect(() => {
    const position = labeled ? positions.current[active] : index * 48;
    if (position !== undefined) scroller.current?.scrollTo({ x: Math.max(0, position - scrollWidth / 2 + 24), animated: false });
  }, [active, index, labeled, scrollWidth]);
  return <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
    {canToggle && <SurfacePressable accessibilityRole="button" accessibilityLabel={labeled ? 'Show icons only' : 'Show tab labels'} accessibilityState={{ expanded: labeled }} onPress={() => setShowLabels(value => !value)} style={styles.labelToggle}>
      {labeled ? <ChevronLeft size={16} color={theme.colors.textSecondary} /> : <ChevronRight size={16} color={theme.colors.textSecondary} />}
    </SurfacePressable>}
    <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ flexGrow: 1 }}>
      {tabs.map(({ id, label, Icon, accessibilityLabel }) => {
        const selected = id === active;
        const count = counts?.[id] || 0;
        const color = selected ? theme.isDark ? '#FFAE79' : '#B84400' : theme.colors.textSecondary;
        return <SurfacePressable key={id} accessibilityRole="tab" accessibilityLabel={accessibilityLabel || `${label} tab`} accessibilityHint={count ? `${count} pending` : undefined} accessibilityState={{ selected }} onPress={() => onSelect(id)}
          onLayout={event => { positions.current[id] = event.nativeEvent.layout.x; }}
          style={[styles.tab, labeled && styles.labeledTab, { borderBottomColor: selected ? theme.colors.primary : 'transparent' }]}>
          <Icon size={18} color={color} />
          {labeled && <Text style={{ color, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text>}
          {count > 0 && <Text style={styles.pendingCount}>{count > 99 ? '99+' : count}</Text>}
        </SurfacePressable>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  banner: { margin: 14, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1B2E3C', padding: 16, paddingVertical: 20 },
  title: { color: '#FFFFFF', fontSize: 20, lineHeight: 27, fontWeight: '800' },
  subtitle: { color: '#F1F5F9', fontSize: 13, lineHeight: 20, marginTop: 3 },
  code: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', backgroundColor: '#FFFFFF35', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 11 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  detailText: { color: '#F8FAFC', fontSize: 12, lineHeight: 18, flexShrink: 1 },
  status: { marginTop: 9, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FFFFFF30', backgroundColor: '#FFFFFF25', flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start' },
  tabBar: { flexDirection: 'row', flexGrow: 0, flexShrink: 0, borderBottomWidth: 1 },
  labelToggle: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  labeledTab: { flexDirection: 'row', gap: 7, paddingHorizontal: 13 },
  pendingCount: { position: 'absolute', right: 1, top: 1, backgroundColor: '#B42318', borderRadius: 8, color: '#FFFFFF', paddingHorizontal: 3, fontSize: 10 },
  tab: { minWidth: 48, minHeight: 48, flex: 1, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2 },
});
