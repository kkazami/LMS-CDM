import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Search, Users, Award, UserCheck, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { TOUCH_TARGET } from '../../../../src/lib/typography';
import type { Course } from '@lms/types';

export default function TeacherCoursesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourses = async () => {
    try {
      const instituteCode = user?.institute?.code || 'ics';
      const response = await api.courses.list(instituteCode);
      if (response?.courses) {
        setCourses(response.courses);
      }
    } catch {
      // Graceful fallback
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Teaching Classes</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          {courses.length} Active Teaching Assignments &bull; {user?.institute?.name || theme.name}
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
          <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Filter classes by code or title..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Course Cards List */}
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
                {searchQuery ? 'No Matching Classes Found' : 'No Classes Assigned'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery
                  ? 'Try modifying your search query.'
                  : 'Classes assigned to you will appear here.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.courseCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id } })}
              activeOpacity={0.85}
            >
              <View style={styles.courseHeader}>
                <Badge label={item.code || 'CODE'} variant="primary" size="sm" />
                {item.section && (
                  <Badge label={item.section} variant="default" size="sm" />
                )}
              </View>

              <Text style={[styles.courseTitle, { color: theme.colors.text }]}>
                {item.title}
              </Text>

              {item.description && (
                <Text style={[styles.courseDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Roster & Stats Counter */}
              <View style={[styles.statsBar, { backgroundColor: theme.colors.cardSecondary }]}>
                <View style={styles.statItem}>
                  <Users size={16} color={theme.colors.primary} />
                  <Text style={[styles.statText, { color: theme.colors.text }]}>
                    {item.studentCount ?? item.enrolledCount ?? 0} Enrolled
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Award size={16} color={theme.colors.success} />
                  <Text style={[styles.statText, { color: theme.colors.text }]}>
                    Gradebook Ready
                  </Text>
                </View>
              </View>

              {/* Instructor Controls */}
              <View style={[styles.actionRow, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: theme.colors.border }]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'PEOPLE' } })}
                  activeOpacity={0.7}
                >
                  <Users size={16} color={theme.colors.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                    Roster
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: theme.colors.border }]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'GRADEBOOK' } })}
                  activeOpacity={0.7}
                >
                  <Award size={16} color={theme.colors.success} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                    Grades
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'CLASSWORK' } })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Classwork
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  courseDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    minHeight: 40,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
