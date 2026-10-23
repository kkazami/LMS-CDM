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
import { BookOpen, Search, Users, Award } from 'lucide-react-native';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useResponsive } from '../../../../src/hooks/useResponsive';
import { ScreenWrapper, ScreenHeaderContainer } from '../../../../src/components/common/ScreenWrapper';
import { Badge } from '../../../../src/components/common/Badge';
import { Card } from '../../../../src/components/common/Card';
import { getCanonicalInstituteName } from '../../../../src/lib/theme';
import type { Course } from '@lms/types';

export default function TeacherCoursesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const api = useAuthStore((s) => s.api);
  const theme = useTheme();
  const { s, font, maxFontSizeMultiplier, bottomClearance } = useResponsive();

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
    <ScreenWrapper>
      {/* Header Container with Safe Area Inset */}
      <ScreenHeaderContainer
        style={[
          styles.headerContainer,
          {
            paddingHorizontal: s(16),
            paddingBottom: s(10),
          },
        ]}
      >
        <Text
          style={[styles.headerTitle, { color: theme.colors.text, fontSize: font(22) }]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          numberOfLines={1}
        >
          My Teaching Classes
        </Text>
        <Text
          style={[styles.headerSubtitle, { color: theme.colors.textSecondary, fontSize: font(12), marginBottom: s(8) }]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {courses.length} Active Teaching Assignments &bull; {getCanonicalInstituteName(user?.institute?.code, user?.institute?.name || theme.name)}
        </Text>

        {/* Compact Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.cardSecondary,
              borderColor: theme.colors.border,
              minHeight: s(38),
              borderRadius: s(10),
              paddingHorizontal: s(10),
            },
          ]}
        >
          <Search size={s(15)} color={theme.colors.textSecondary} style={{ marginRight: s(6) }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, fontSize: font(13) }]}
            placeholder="Filter classes by code or title..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          />
        </View>
      </ScreenHeaderContainer>

      {/* Course Cards List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              padding: s(13),
              paddingBottom: bottomClearance,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <Card style={[styles.emptyCard, { paddingVertical: s(32) }]}>
              <BookOpen size={s(40)} color={theme.colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: theme.colors.text, fontSize: font(15) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {searchQuery ? 'No Matching Classes Found' : 'No Classes Assigned'}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontSize: font(12) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
              >
                {searchQuery
                  ? 'Try modifying your search query.'
                  : 'Classes assigned to you will appear here.'}
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.courseCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderRadius: s(14),
                  padding: s(12),
                  marginBottom: s(10),
                },
              ]}
              onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id } })}
              activeOpacity={0.85}
            >
              <View style={[styles.courseHeader, { marginBottom: s(6) }]}>
                <Badge label={item.code || 'CODE'} variant="primary" size="sm" />
                {item.section && (
                  <Badge label={item.section} variant="default" size="sm" />
                )}
              </View>

              <Text
                style={[styles.courseTitle, { color: theme.colors.text, fontSize: font(15.5), marginBottom: s(4) }]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {item.description && (
                <Text
                  style={[
                    styles.courseDescription,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: font(12),
                      lineHeight: s(16),
                      marginBottom: s(8),
                    },
                  ]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                >
                  {item.description}
                </Text>
              )}

              {/* Roster & Stats Counter */}
              <View
                style={[
                  styles.statsBar,
                  {
                    backgroundColor: theme.colors.cardSecondary,
                    paddingVertical: s(5),
                    paddingHorizontal: s(10),
                    borderRadius: s(8),
                    marginBottom: s(8),
                  },
                ]}
              >
                <View style={styles.statItem}>
                  <Users size={s(13)} color={theme.colors.primary} />
                  <Text
                    style={[styles.statText, { color: theme.colors.text, fontSize: font(11.5) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    {item.studentCount ?? item.enrolledCount ?? 0} Enrolled
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Award size={s(13)} color={theme.colors.success} />
                  <Text
                    style={[styles.statText, { color: theme.colors.text, fontSize: font(11.5) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Gradebook Ready
                  </Text>
                </View>
              </View>

              {/* Instructor Compact Controls */}
              <View style={[styles.actionRow, { borderTopColor: theme.colors.border, paddingTop: s(8), gap: s(6) }]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Roster"
                  style={[
                    styles.actionButton,
                    {
                      borderColor: theme.colors.border,
                      paddingVertical: s(6),
                      minHeight: s(34),
                      borderRadius: s(8),
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'PEOPLE' } })}
                  activeOpacity={0.7}
                >
                  <Users size={s(13)} color={theme.colors.primary} />
                  <Text
                    style={[styles.actionButtonText, { color: theme.colors.text, fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Roster
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Grades"
                  style={[
                    styles.actionButton,
                    {
                      borderColor: theme.colors.border,
                      paddingVertical: s(6),
                      minHeight: s(34),
                      borderRadius: s(8),
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'GRADEBOOK' } })}
                  activeOpacity={0.7}
                >
                  <Award size={s(13)} color={theme.colors.success} />
                  <Text
                    style={[styles.actionButtonText, { color: theme.colors.text, fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Grades
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Classwork"
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary,
                      paddingVertical: s(6),
                      minHeight: s(34),
                      borderRadius: s(8),
                    },
                  ]}
                  onPress={() => router.push({ pathname: '/teacher/courses/[courseId]' as any, params: { courseId: item.id, initialTab: 'CLASSWORK' } })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.actionButtonText, { color: '#FFFFFF', fontWeight: '700', fontSize: font(12) }]}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                  >
                    Classwork
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerContainer: {},
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  listContent: {},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseCard: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseTitle: {
    fontWeight: '700',
  },
  courseDescription: {},
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
