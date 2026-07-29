import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const api = useAuthStore((state) => state.api);
  const theme = useTheme();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      api.courses
        .get(courseId)
        .then((res) => setCourse(res.course))
        .catch(() => setCourse(null))
        .finally(() => setLoading(false));
    }
  }, [courseId]);

  if (loading) return <LoadingSpinner message="Loading course details..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={course?.title || 'Course Detail'} showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <Text style={styles.code}>{course?.code || course?.courseCode || 'COURSE'}</Text>
          <Text style={styles.title}>{course?.title}</Text>
          {course?.instructorName ? (
            <Text style={styles.instructor}>Instructor: {course.instructorName}</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionHeader}>Stream & Announcements</Text>
        <Card>
          <Text style={styles.placeholderText}>
            Class stream and discussion items will be displayed here.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerCard: { marginBottom: 16 },
  code: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '800', color: '#2C2727', marginTop: 4 },
  instructor: { fontSize: 13, color: '#4B5563', marginTop: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#2C2727', marginBottom: 8, marginTop: 8 },
  placeholderText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic' },
});
