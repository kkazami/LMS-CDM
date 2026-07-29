import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { BookOpen, User, MapPin } from 'lucide-react-native';
import type { Course } from '@lms/types';

export default function CoursesListScreen() {
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const instituteCode = user?.institute?.code || 'ics';

  const fetchCourses = async () => {
    try {
      const res = await api.courses.list(instituteCode);
      setCourses(res.courses || []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [instituteCode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  if (loading) return <LoadingSpinner message="Loading courses..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Courses" subtitle={`${user?.institute?.name || ''}`} />

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            title="No Courses Found"
            message="You are not currently enrolled in any courses for this institute."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/${instituteCode}/courses/${item.id}` as any)}
          >
            <Card style={styles.courseCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                  <BookOpen size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseTitle}>{item.title}</Text>
                  <Text style={styles.courseCode}>{item.code || item.courseCode}</Text>
                </View>
                {item.section ? <Badge label={`Sec ${item.section}`} variant="default" /> : null}
              </View>

              <View style={styles.metaRow}>
                {item.instructorName ? (
                  <View style={styles.metaItem}>
                    <User size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{item.instructorName}</Text>
                  </View>
                ) : null}
                {item.room ? (
                  <View style={styles.metaItem}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{item.room}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  courseCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  courseTitle: { fontSize: 16, fontWeight: '700', color: '#2C2727' },
  courseCode: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
});
