import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronRight, ChevronUp, MapPin, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { MobileCourse } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { API_BASE_URL } from '../../lib/constants';

export function IcsCourseCard({ course, teacher, index, count, saving, onMove }: { course: MobileCourse; teacher: boolean; index: number; count: number; saving: boolean; onMove: (index: number, direction: number) => void }) {
  const theme = useTheme(), router = useRouter();
  const path = `/${teacher ? 'teacher' : 'student'}/courses/${course.id}`;
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const cover = course.coverImage ? new URL(course.coverImage, API_BASE_URL).href : null;
  function open(tab?: string) { router.push((path + (tab ? `?${teacher ? 'initialTab' : 'tab'}=${tab}` : '')) as never); }
  return <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open course ${course.title}`} onPress={() => open()}>
      <LinearGradient colors={index % 3 === 0 ? ['#3D1976', '#160B29'] : index % 3 === 1 ? ['#154638', '#071C16'] : ['#243B4B', '#0E1821']} style={styles.cover}>
        {cover && <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} />}
        {cover && <LinearGradient colors={['#00000022', '#000000CC']} style={StyleSheet.absoluteFill} />}
        <View style={styles.badges}>
          <View style={styles.codeBadge}><Text style={styles.badgeText}>{course.courseCode || course.code}</Text></View>
          {!!course.section && <View style={styles.sectionBadge}><Text style={styles.badgeText}>{course.section}</Text></View>}
          {teacher && course.pendingWorkCount > 0 && <View style={styles.pendingBadge}><Text style={styles.badgeText}>{course.pendingWorkCount} to grade</Text></View>}
        </View>
        <Text style={styles.title}>{course.title}</Text>
      </LinearGradient>
    </Pressable>
    <View style={styles.body}>
      <View style={styles.metadata}><Users size={15} color={theme.colors.textSecondary} /><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? `${course.enrolledCount ?? 0} enrolled students` : course.instructorName || 'Instructor to be assigned'}</Text></View>
      {!!course.room && <View style={styles.metadata}><MapPin size={15} color={theme.colors.textSecondary} /><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Room {course.room}</Text></View>}
      <View style={[styles.footer, { borderColor: theme.colors.border }]}>
        <View style={styles.links}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Classwork for ${course.title}`} style={styles.link} onPress={() => open('CLASSWORK')}><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Classwork</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${teacher ? 'Gradebook' : 'Grades'} for ${course.title}`} style={styles.link} onPress={() => open(teacher ? 'GRADEBOOK' : 'GRADES')}><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? 'Gradebook' : 'Grades'}</Text></Pressable>
        </View>
        <View style={styles.links}>{[-1, 1].map(direction => {
          const disabled = saving || index + direction < 0 || index + direction >= count;
          const Icon = direction < 0 ? ChevronUp : ChevronDown;
          return <Pressable key={direction} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={`Move ${course.title} ${direction < 0 ? 'up' : 'down'}`} disabled={disabled} onPress={() => onMove(index, direction)} style={[styles.move, { opacity: disabled ? 0.3 : 1, borderColor: theme.colors.border }]}><Icon size={15} color={theme.colors.textSecondary} /></Pressable>;
        })}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Go to course ${course.title}`} style={[styles.link, styles.go]} onPress={() => open()}><Text style={[styles.detail, { color: accent }]}>Go to Course</Text><ChevronRight size={15} color={accent} /></Pressable>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  cover: { minHeight: 112, padding: 16, justifyContent: 'space-between', gap: 22 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  codeBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#FFFFFF40', backgroundColor: '#FFFFFF22' },
  sectionBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: '#00000055' },
  pendingBadge: { backgroundColor: '#BE123C', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  detail: { fontSize: 13, lineHeight: 20, flexShrink: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingVertical: 5, gap: 4 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { minHeight: 44, justifyContent: 'center' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  move: { width: 36, height: 36, marginVertical: 4, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
