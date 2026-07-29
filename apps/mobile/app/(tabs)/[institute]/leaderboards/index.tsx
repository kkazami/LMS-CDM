import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { Trophy, Flame } from 'lucide-react-native';

export default function LeaderboardsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const instituteCode = user?.institute?.code || 'ics';

  const fetchLeaderboard = async () => {
    try {
      const res = await api.leaderboard.get(instituteCode);
      setEntries(res.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [instituteCode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  if (loading) return <LoadingSpinner message="Loading leaderboard..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Leaderboard" subtitle="Top student rankings & streaks" showBack />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            title="No Rankings Available"
            message="Leaderboard data will populate as students complete activities and earn points."
          />
        }
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rankBadge, index < 3 && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.rankText, index < 3 && { color: '#FFFFFF' }]}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{item.userName}</Text>
                <View style={styles.streakRow}>
                  <Flame size={12} color="#EF4444" />
                  <Text style={styles.streakText}>{item.currentStreak || 0} day streak</Text>
                </View>
              </View>
              <Text style={[styles.points, { color: theme.colors.primary }]}>{item.totalPoints || 0} pts</Text>
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
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#4B5563' },
  userName: { fontSize: 15, fontWeight: '700', color: '#2C2727' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  streakText: { fontSize: 12, color: '#6B7280' },
  points: { fontSize: 15, fontWeight: '800' },
});
