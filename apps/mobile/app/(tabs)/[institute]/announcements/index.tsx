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
import { Megaphone } from 'lucide-react-native';
import type { Announcement } from '@lms/types';

export default function AnnouncementsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['announcements-feed', instituteCode],
    queryFn: () => api.announcements.list(instituteCode),
  });

  const announcements = data?.announcements || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Announcements" subtitle="Campus & Course Broadcasts" />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={100} borderRadius={16} />
          <SkeletonLoader height={100} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={announcements}
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
              icon={Megaphone}
              title="No Announcements"
              message="Important announcements will appear here when posted."
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {(item.authorName || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.authorName, typography.headingSm, { color: theme.colors.text }]}>
                    {item.authorName || 'Academic Staff'}
                  </Text>
                  <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.content, typography.bodyMd, { color: theme.colors.text }]}>
                {item.content}
              </Text>
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
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  authorName: {
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
  },
  content: {
    lineHeight: 20,
  },
});
