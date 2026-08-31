import React from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography } from '../../../../src/lib/typography';
import { Award, Lock } from 'lucide-react-native';
import type { StudentBadge } from '@lms/types';

export default function AchievementsScreen() {
  const api = useAuthStore((state) => state.api);
  const theme = useTheme();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['badges-list'],
    queryFn: () => api.gamification.getBadges(),
  });

  const badges = data?.badges || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Achievements & Badges" subtitle="Milestones, Streaks & Special Honors" />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={80} borderRadius={16} />
          <SkeletonLoader height={80} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.badgeCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                !item.isUnlocked && { opacity: 0.5 },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: item.isUnlocked ? theme.colors.primary + '20' : '#9CA3AF20' },
                ]}
              >
                {item.isUnlocked ? (
                  <Award size={24} color={theme.colors.primary} />
                ) : (
                  <Lock size={20} color="#9CA3AF" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeTitle, typography.headingSm, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.badgeDesc, { color: theme.colors.textSecondary }]}>
                  {item.description}
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
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
