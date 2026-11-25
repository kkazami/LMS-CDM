import React, { useState } from 'react';
import { Text } from '../ui/Text';
import { CourseCover } from './CourseCover';
import { CourseCoverEditor } from './CourseCoverEditor';
import { StyleSheet, View } from 'react-native';
import { SurfacePressable as Pressable } from '../motion/SurfacePressable';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, MapPin, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { MobileCourse } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';

export function IcsCourseCard({ course, teacher, index, count, saving, onMove }: { course: MobileCourse; teacher: boolean; index: number; count: number; saving: boolean; onMove: (index: number, direction: number) => void }) {
  const theme = useTheme(), router = useRouter();
  const path = `/${teacher ? 'teacher' : 'student'}/courses/${course.id}`;
  const accent = theme.isDark ? '#FFAE79' : '#B84400';
  const [editingCover, setEditingCover] = useState(false);
  function open(tab?: string) { router.push((path + (tab ? `?${teacher ? 'initialTab' : 'tab'}=${tab}` : '')) as never); }
  return <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open course ${course.title}`} onPress={() => open()}>
      <View style={styles.heading}>
        <CourseCover value={course.mobileCoverImage || course.coverImage} contentPosition={!course.mobileCoverImage && course.coverImage?.startsWith('/course-banners/') ? 'right center' : undefined} style={styles.thumbnail} fallback={
            <LinearGradient colors={index % 3 === 0 ? ['#3D1976', '#160B29'] : index % 3 === 1 ? ['#154638', '#071C16'] : ['#243B4B', '#0E1821']} style={[StyleSheet.absoluteFill, styles.placeholder]}><BookOpen size={25} color="#FFFFFF" aria-hidden /></LinearGradient>
          } />
        <View style={styles.headingText}>
          <Text style={[styles.courseCode, { color: accent }]}>{course.courseCode || course.code}{course.section ? ` · ${course.section}` : ''}</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>{course.title}</Text>
          {teacher && course.pendingWorkCount > 0 && <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{course.pendingWorkCount} to grade</Text>}
        </View>
        <ChevronRight size={18} color={accent} aria-hidden />
      </View>
    </Pressable>
    <View style={styles.body}>
      <View style={styles.metadata}><Users size={15} color={theme.colors.textSecondary} /><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? `${course.enrolledCount ?? 0} enrolled students` : course.instructorName || 'Instructor to be assigned'}</Text></View>
      {!!course.room && <View style={styles.metadata}><MapPin size={15} color={theme.colors.textSecondary} /><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{course.room}</Text></View>}
      <View style={[styles.footer, { borderColor: theme.colors.border }]}>
        <View style={styles.links}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Classwork for ${course.title}`} style={styles.link} onPress={() => open('CLASSWORK')}><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Classwork</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${teacher ? 'Gradebook' : 'Grades'} for ${course.title}`} style={styles.link} onPress={() => open(teacher ? 'GRADEBOOK' : 'GRADES')}><Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? 'Gradebook' : 'Grades'}</Text></Pressable>
        </View>
        <View style={styles.links}>{[-1, 1].map(direction => {
          const disabled = saving || index + direction < 0 || index + direction >= count;
          const Icon = direction < 0 ? ChevronUp : ChevronDown;
          return <Pressable key={direction} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={`Move ${course.title} ${direction < 0 ? 'up' : 'down'}`} disabled={disabled} onPress={() => onMove(index, direction)} style={[styles.move, { opacity: disabled ? 0.3 : 1, backgroundColor: theme.colors.cardSecondary }]}><Icon size={15} color={theme.colors.textSecondary} /></Pressable>;
        })}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Go to course ${course.title}`} style={[styles.link, styles.go]} onPress={() => open()}><Text style={[styles.detail, { color: accent }]}>Go to Course</Text><ChevronRight size={15} color={accent} /></Pressable>
      </View>
      {teacher && <Pressable accessibilityRole="button" accessibilityLabel={`Customize cover for ${course.title}`} style={[styles.link, { minHeight: 48 }]} onPress={() => setEditingCover(true)}><Text style={[styles.detail, { color: accent }]}>Customize class cover</Text></Pressable>}
    </View>
    {editingCover && <CourseCoverEditor course={course} onClose={() => setEditingCover(false)} />}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden', marginBottom: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  thumbnail: { width: 58, height: 64, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1, minWidth: 0, gap: 4 },
  courseCode: { fontSize: 12, lineHeight: 19, fontWeight: '600' },
  title: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  body: { paddingHorizontal: 16 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  detail: { fontSize: 13, lineHeight: 20, flexShrink: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingVertical: 5, gap: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  link: { minWidth: 48, minHeight: 48, justifyContent: 'center' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  move: { width: 48, height: 48, marginVertical: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
