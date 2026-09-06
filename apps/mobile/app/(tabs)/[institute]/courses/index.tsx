import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { BookOpen, User, MapPin, ChevronRight } from 'lucide-react-native';
import type { Course } from '@lms/types';

export default function CoursesListScreen() {
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const role = (user?.role || 'STUDENT').toUpperCase();
  const isProfessor = role === 'PROFESSOR' || role === 'TEACHER';
  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['courses-list', instituteCode],
    queryFn: () => api.courses.list(instituteCode),
  });

  const courses = data?.courses || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader
        title={isProfessor ? 'My Teaching Classes' : 'Courses'}
        subtitle={user?.institute?.name || 'Academic Coursework'}
      />

      {isLoading ? (
        <View style={styles.loadingPadding}>
          <SkeletonLoader height={120} borderRadius={16} />
          <SkeletonLoader height={120} borderRadius={16} />
          <SkeletonLoader height={120} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={BookOpen}
              title={isProfessor ? 'No Classes Created' : 'No Enrolled Courses'}
              message={
                isProfessor
                  ? 'Create your first course to start distributing coursework and syllabus items.'
                  : 'You are not currently enrolled in any classes for this semester.'
              }
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={'Course: ' + item.title}
              style={[
                styles.courseCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => router.push('/(tabs)/' + instituteCode + '/courses/' + item.id as any)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[theme.colors.sidebar, theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardHeader}
              >
                <View style={styles.headerRow}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeBadgeText}>{item.code || item.courseCode}</Text>
                  </View>
                  {item.section && (
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{'Sec ' + item.section}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.courseTitle, typography.headingSm]} numberOfLines={2}>
                  {item.title}
                </Text>
              </LinearGradient>

              <View style={styles.cardBody}>
                <View style={styles.metaRow}>
                  <User size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, typography.bodySm, { color: theme.colors.textSecondary }]}>
                    {item.instructorName || 'Faculty Instructor'}
                  </Text>
                </View>
                {item.room && (
                  <View style={styles.metaRow}>
                    <MapPin size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, typography.bodySm, { color: theme.colors.textSecondary }]}>
                      {'Room ' + item.room}
                    </Text>
                  </View>
                )}

                <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.enterText, { color: theme.colors.primary }]}>Enter Course Workspace</Text>
                  <ChevronRight size={16} color={theme.colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  loadingPadding: {
    padding: 16,
    gap: 14,
  },
  courseCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionBadgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  courseTitle: {
    color: '#FFFFFF',
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  enterText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
