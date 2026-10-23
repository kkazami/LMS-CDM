import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Search, Users, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { Screen, AppHeader, ErrorBanner } from '../../../../src/components/ui';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import { getCachedData, setCachedData } from '../../../../src/lib/offline-storage';
import { getCanonicalInstituteName } from '../../../../src/lib/theme';
import type { Course } from '@lms/types';

export default function StudentCoursesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCourses = async () => {
    try {
      setErrorMessage(null);
      const cached = await getCachedData<Course[]>('student_courses');
      if (cached && cached.length > 0) {
        setCourses(cached);
        setLoading(false);
      }

      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.courses.list(instituteCode);
      if (response?.courses) {
        setCourses(response.courses);
        await setCachedData('student_courses', response.courses);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not refresh enrolled courses. Showing offline data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <Screen style={styles.screen}>
      {/* AppHeader */}
      <AppHeader
        title="Enrolled Courses"
        subtitle={`${courses.length} Active ${courses.length === 1 ? 'Course' : 'Courses'} • ${getCanonicalInstituteName(user?.institute?.code, user?.institute?.name || theme.name)}`}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
          <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by course code or title..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorWrapper}>
          <ErrorBanner
            message={errorMessage}
            onRetry={loadCourses}
            onDismiss={() => setErrorMessage(null)}
            retryAccessibilityLabel="Retry loading courses"
          />
        </View>
      )}

      {/* Courses List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <BookOpen size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {searchQuery ? 'No Matching Courses Found' : 'No Enrolled Courses'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery
                  ? 'Try adjusting your search criteria or clear the query.'
                  : 'Courses will appear here once your enrollment is confirmed.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.courseCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push({ pathname: '/student/courses/[courseId]' as any, params: { courseId: item.id } })}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Course: ${item.title}`}
            >
              <View style={styles.courseCardTop}>
                <Badge label={item.code || 'COURSE'} variant="primary" size="sm" />
                <View style={styles.badgeGroup}>
                  {item.section && (
                    <Badge label={item.section} variant="default" size="sm" />
                  )}
                </View>
              </View>

              <Text style={[styles.courseTitle, { color: theme.colors.text }]}>
                {item.title}
              </Text>

              {item.description && (
                <Text
                  style={[styles.courseDescription, { color: theme.colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              <View style={[styles.courseCardFooter, { borderTopColor: theme.colors.border }]}>
                <View style={styles.instructorInfo}>
                  <Users size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.instructorName, { color: theme.colors.textSecondary }]}>
                    {item.instructorName || 'Faculty Professor'}
                  </Text>
                </View>

                <View style={styles.actionPrompt}>
                  <Text style={[styles.actionText, { color: theme.colors.primary }]}>
                    View Hub
                  </Text>
                  <ChevronRight size={16} color={theme.colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: TOUCH_TARGET,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  errorWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  courseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  courseDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  courseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  instructorName: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
