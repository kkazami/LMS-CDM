import React from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography } from '../../../../src/lib/typography';
import { Trophy } from 'lucide-react-native';
import type { Grade, GradeSummary } from '@lms/types';

export default function GradesScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['grades-list', instituteCode],
    queryFn: () => api.grades.list(instituteCode),
  });

  const grades = data?.grades || [];
  const summaries = data?.summary || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Grades & Evaluation" subtitle="Academic Performance Tracking" />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={100} borderRadius={16} />
          <SkeletonLoader height={60} borderRadius={14} />
          <SkeletonLoader height={60} borderRadius={14} />
        </View>
      ) : (
        <FlatList
          data={grades}
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
          ListHeaderComponent={
            summaries.length > 0 ? (
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.summaryHeading, typography.headingSm, { color: theme.colors.text }]}>
                  Cumulative Overview
                </Text>
                {summaries.map((s, idx) => (
                  <View key={idx} style={styles.summaryRow}>
                    <Text style={[styles.summaryCourse, { color: theme.colors.textSecondary }]}>
                      {s.courseName || 'Class'}
                    </Text>
                    <Text style={[styles.summaryScore, typography.tabular, { color: theme.colors.primary }]}>
                      {s.percentage !== undefined ? s.percentage + '%' : 'Pending'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={Trophy}
              title="No Grades Posted"
              message="Your evaluated scores and GPA breakdown will appear here."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.gradeCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.gradeTitle, typography.headingSm, { color: theme.colors.text }]}>
                  {item.assignmentTitle || 'Coursework'}
                </Text>
                <Text style={[styles.gradeCourse, { color: theme.colors.textSecondary }]}>
                  {item.courseName}
                </Text>
              </View>

              <View style={styles.scoreBox}>
                <Text style={[styles.scoreText, typography.tabular, { color: theme.colors.primary }]}>
                  {item.value !== null ? item.value + ' / ' + item.maxValue : 'Ungraded'}
                </Text>
              </View>
            </View>
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
  loadingBox: {
    padding: 16,
    gap: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  summaryHeading: {
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryCourse: {
    fontSize: 13,
  },
  summaryScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  gradeTitle: {
    fontWeight: '600',
  },
  gradeCourse: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
