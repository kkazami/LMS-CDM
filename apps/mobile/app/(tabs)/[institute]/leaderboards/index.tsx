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
import { Trophy, Flame } from 'lucide-react-native';
import type { LeaderboardEntry } from '@lms/types';

export default function LeaderboardsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard-rankings', instituteCode],
    queryFn: () => api.leaderboard.get(instituteCode),
  });

  const entries = data?.entries || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Leaderboard" subtitle="Academic Points & Streak Rankings" />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={70} borderRadius={14} />
          <SkeletonLoader height={70} borderRadius={14} />
          <SkeletonLoader height={70} borderRadius={14} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId || '' + item.rank}
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
              icon={Trophy}
              title="No Leaderboard Data"
              message="Rankings will update as students complete coursework."
            />
          }
          renderItem={({ item }) => {
            const isTop3 = item.rank <= 3;
            const isMe = item.userId === user?.id;
            return (
              <View
                style={[
                  styles.entryCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  isMe && { borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    item.rank === 1 && { backgroundColor: '#FEF08A' },
                    item.rank === 2 && { backgroundColor: '#E2E8F0' },
                    item.rank === 3 && { backgroundColor: '#FFEDD5' },
                    !isTop3 && { backgroundColor: theme.isDark ? '#2E3547' : '#F3F4F6' },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      item.rank === 1 && { color: '#854D0E' },
                      item.rank === 2 && { color: '#475569' },
                      item.rank === 3 && { color: '#9A3412' },
                      !isTop3 && { color: theme.colors.textSecondary },
                    ]}
                  >
                    {'#' + item.rank}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, typography.headingSm, { color: theme.colors.text }]}>
                    {item.userName} {isMe ? '(You)' : ''}
                  </Text>
                  <View style={styles.streakRow}>
                    <Flame size={12} color="#F59E0B" />
                    <Text style={[styles.streakText, { color: theme.colors.textSecondary }]}>
                      {item.currentStreak + 'd streak'}
                    </Text>
                  </View>
                </View>

                <View style={styles.pointsBox}>
                  <Text style={[styles.pointsText, typography.tabular, { color: theme.colors.primary }]}>
                    {item.totalPoints + ' pts'}
                  </Text>
                </View>
              </View>
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
  loadingBox: {
    padding: 16,
    gap: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  userName: {
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: {
    fontSize: 11,
  },
  pointsBox: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
