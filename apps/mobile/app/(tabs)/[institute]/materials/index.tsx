import React from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { SkeletonLoader } from '../../../../src/components/common/SkeletonLoader';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { OfflineBanner } from '../../../../src/components/common/OfflineBanner';
import { typography, TOUCH_TARGET } from '../../../../src/lib/typography';
import { Layers, FileText, Download } from 'lucide-react-native';
import type { CourseMaterialsGroup } from '@lms/types';

export default function MaterialsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const instituteCode = user?.institute?.code || 'ics';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['materials-list', instituteCode],
    queryFn: () => api.materials.list(instituteCode),
  });

  const groups = data?.groups || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <OfflineBanner />
      <ScreenHeader title="Learning Materials" subtitle="Course Modules & File Downloads" />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <SkeletonLoader height={100} borderRadius={16} />
          <SkeletonLoader height={100} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.courseId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState icon={Layers} title="No Materials" message="Published learning materials will appear here." />
          }
          renderItem={({ item }) => (
            <View style={[styles.groupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.courseHeading, typography.headingSm, { color: theme.colors.text }]}>
                {item.courseCode + ' — ' + item.courseTitle}
              </Text>

              {item.materials.map((mat) => (
                <View key={mat.id} style={[styles.materialRow, { borderTopColor: theme.colors.border }]}>
                  <FileText size={16} color={theme.colors.primary} />
                  <Text style={[styles.matTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {mat.title}
                  </Text>
                  {mat.attachments.map((att) => (
                    <TouchableOpacity
                      key={att.id}
                      style={[styles.downloadBtn, { backgroundColor: theme.colors.primary + '18' }]}
                      onPress={() => Linking.openURL(att.url)}
                    >
                      <Download size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
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
  groupCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  courseHeading: {
    fontWeight: '700',
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  matTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  downloadBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
