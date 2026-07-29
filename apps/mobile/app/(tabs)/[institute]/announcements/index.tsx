import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { Megaphone, User, Clock } from 'lucide-react-native';
import type { Announcement } from '@lms/types';

export default function AnnouncementsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const instituteCode = user?.institute?.code || 'ics';

  const fetchAnnouncements = async () => {
    try {
      const res = await api.announcements.list(instituteCode);
      setAnnouncements(res.announcements || []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [instituteCode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  if (loading) return <LoadingSpinner message="Loading announcements..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Announcements" subtitle="Latest notices and campus updates" />

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            title="No Announcements"
            message="There are no active announcements posted for your institute."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Megaphone size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.courseName ? <Text style={styles.courseName}>{item.courseName}</Text> : null}
              </View>
            </View>

            <Text style={styles.content}>{item.content}</Text>

            <View style={styles.footer}>
              <View style={styles.metaItem}>
                <User size={13} color="#6B7280" />
                <Text style={styles.metaText}>{item.authorName}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={13} color="#6B7280" />
                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#2C2727' },
  courseName: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  content: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
});
