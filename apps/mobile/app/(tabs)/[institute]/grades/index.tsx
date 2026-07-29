import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { Trophy, Award } from 'lucide-react-native';
import type { Grade } from '@lms/types';

export default function GradesScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const instituteCode = user?.institute?.code || 'ics';

  const fetchGrades = async () => {
    try {
      const res = await api.grades.list(instituteCode);
      setGrades(res.grades || []);
    } catch {
      setGrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [instituteCode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGrades();
  };

  if (loading) return <LoadingSpinner message="Loading grades..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Grades & Performance" subtitle="Academic records" />

      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            title="No Grades Released"
            message="Your graded submissions and coursework marks will appear here once published by your instructors."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Award size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentTitle}>{item.assignmentTitle}</Text>
                <Text style={styles.courseName}>{item.courseName}</Text>
              </View>
              <View style={styles.scoreContainer}>
                <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
                  {item.value} / {item.maxValue}
                </Text>
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
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assignmentTitle: { fontSize: 15, fontWeight: '700', color: '#2C2727' },
  courseName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scoreContainer: { alignItems: 'flex-end' },
  scoreValue: { fontSize: 16, fontWeight: '800' },
});
