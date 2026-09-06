import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { ClipboardList, Clock, ChevronRight } from 'lucide-react-native';
import type { Assignment } from '@lms/types';

export default function AssignmentsScreen() {
  const router = useRouter();
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['assignments-list', instituteCode],
    queryFn: () => api.assignments.list(instituteCode),
  });

  const assignments = data?.assignments || [];

  const filtered = assignments.filter((item) => {
    if (filter === 'ALL') return true;
    return filter === 'PENDING';
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="To-do & Assignments" subtitle="Deadlines and Coursework Items" />

      <View style={[styles.filterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        {(['ALL', 'PENDING', 'DONE'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                isActive && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setFilter(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={80} borderRadius={14} />
          <SkeletonLoader height={80} borderRadius={14} />
          <SkeletonLoader height={80} borderRadius={14} />
        </View>
      ) : (
        <FlatList
          data={filtered}
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
              icon={ClipboardList}
              title="All Caught Up!"
              message="No outstanding coursework items found matching your filter."
            />
          }
          renderItem={({ item }) => {
            const dueDate = item.dueDate ? new Date(item.dueDate) : null;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={'Assignment: ' + item.title}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() =>
                  router.push('/(tabs)/' + instituteCode + '/courses/' + item.courseId as any)
                }
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                  <ClipboardList size={18} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, typography.headingSm, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.courseSubtitle, typography.bodySm, { color: theme.colors.textSecondary }]}>
                    {item.courseCode || item.courseName || 'Coursework'}
                  </Text>
                  {dueDate && (
                    <View style={styles.dueRow}>
                      <Clock size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.dueText, { color: theme.colors.textSecondary }]}>
                        {'Due ' + dueDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minHeight: TOUCH_TARGET,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    fontWeight: '700',
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    minHeight: TOUCH_TARGET,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontWeight: '600',
  },
  courseSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
