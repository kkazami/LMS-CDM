import React from 'react';
import { Text } from '../ui/Text';
import { courseCoverSource } from '../../lib/course-cover';
import { mobileCourseBannerSource } from '../../lib/mobile-course-banners';
import { useAuthStore } from '../../stores/auth-store';
import { StyleSheet, View } from 'react-native';
import { SurfacePressable as Pressable } from '../motion/SurfacePressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, MapPin, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { Course } from '@lms/types';
import { useTheme } from '../../hooks/useTheme';
import { API_BASE_URL } from '../../lib/constants';

export function IbeCourseCard({
  course,
  teacher = false,
  index = 0,
  count = 1,
  saving = false,
  onMove,
}: {
  course: Course;
  teacher?: boolean;
  index?: number;
  count?: number;
  saving?: boolean;
  onMove?: (index: number, direction: number) => void;
}) {
  const theme = useTheme(), router = useRouter();
  const user = useAuthStore(s => s.user);
  const isTeacher = teacher || ['PROFESSOR', 'TEACHER', 'INSTRUCTOR'].includes((user?.role || '').toUpperCase());
  const path = `/${isTeacher ? 'teacher' : 'student'}/courses/${course.id}`;
  const accent = theme.isDark ? '#FFAE19' : '#B8860B';
  const token = useAuthStore(s => s.token);
  const image = (course as any).mobileCoverImage || course.coverImage;
  const cover = mobileCourseBannerSource(image) || courseCoverSource(image, API_BASE_URL, token);

  function open(tab?: string) {
    router.push((path + (tab ? `?${isTeacher ? 'initialTab' : 'tab'}=${tab}` : '')) as never);
  }

  // Warm gold and bronze gradient backgrounds tailored for IBE
  const gradients = [
    ['#4A3505', '#1F1602'],
    ['#3B2A08', '#171003'],
    ['#543B05', '#241902'],
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open course ${course.title}`} onPress={() => open()}>
        <View style={styles.heading}>
          <LinearGradient colors={gradient} style={styles.thumbnail}>
            <BookOpen size={24} color="#FFD700" aria-hidden />
            {cover && (
              <Image
                source={cover}
                contentFit={image?.startsWith('/course-banners/') ? 'contain' : 'cover'}
                style={StyleSheet.absoluteFill}
                aria-hidden
              />
            )}
          </LinearGradient>
          <View style={styles.headingText}>
            <Text style={[styles.courseCode, { color: accent }]}>
              {course.code || 'IBE'}{(course as any).section ? ` · ${(course as any).section}` : ''}
            </Text>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
          <ChevronRight size={18} color={accent} aria-hidden />
        </View>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.metadata}>
          <Users size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.detail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {teacher ? `${(course as any).enrolledCount ?? 0} enrolled students` : course.instructorName || 'Instructor to be assigned'}
          </Text>
        </View>
        {!!(course as any).room && (
          <View style={styles.metadata}>
            <MapPin size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Room {(course as any).room}</Text>
          </View>
        )}

        <View style={[styles.footer, { borderColor: theme.colors.border }]}>
          <View style={styles.links}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Classwork for ${course.title}`}
              style={styles.link}
              onPress={() => open('CLASSWORK')}
            >
              <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>Classwork</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${teacher ? 'Gradebook' : 'Grades'} for ${course.title}`}
              style={styles.link}
              onPress={() => open(teacher ? 'GRADEBOOK' : 'GRADES')}
            >
              <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{teacher ? 'Gradebook' : 'Grades'}</Text>
            </Pressable>
          </View>

          {onMove && count > 1 && (
            <View style={styles.links}>
              {[-1, 1].map((direction) => {
                const disabled = saving || index + direction < 0 || index + direction >= count;
                const Icon = direction < 0 ? ChevronUp : ChevronDown;
                return (
                  <Pressable
                    key={direction}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    accessibilityLabel={`Move ${course.title} ${direction < 0 ? 'up' : 'down'}`}
                    disabled={disabled}
                    onPress={() => onMove(index, direction)}
                    style={[styles.move, { opacity: disabled ? 0.3 : 1, backgroundColor: theme.colors.cardSecondary }]}
                  >
                    <Icon size={15} color={theme.colors.textSecondary} />
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Go to course ${course.title}`}
            style={[styles.link, styles.go]}
            onPress={() => open()}
          >
            <Text style={[styles.detail, { color: accent, fontWeight: '600' }]}>Go to Course</Text>
            <ChevronRight size={15} color={accent} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  courseCode: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detail: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  link: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
  },
  move: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

