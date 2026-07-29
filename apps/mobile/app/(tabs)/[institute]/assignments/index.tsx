import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/auth-store';
import { useTheme } from '../../../../src/hooks/useTheme';
import { ScreenHeader } from '../../../../src/components/common/ScreenHeader';
import { Card } from '../../../../src/components/common/Card';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../../src/components/common/EmptyState';
import { ClipboardList, Calendar } from 'lucide-react-native';
import type { Assignment } from '@lms/types';

export default function AssignmentsScreen() {
  const api = useAuthStore((state) => state.api);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const instituteCode = user?.institute?.code || 'ics';

  const fetchAssignments = async () => {
    try {
      const res = await api.assignments.list(instituteCode);
      setAssignments(res.assignments || []);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [instituteCode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  if (loading) return <LoadingSpinner message="Loading assignments..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Assignments & Tasks" subtitle="Coursework items" showBack />

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            title="No Assignments Found"
            message="You have no pending or assigned coursework tasks."
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.colors.primary}15` }]}>
                <ClipboardList size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.courseName ? <Text style={styles.course}>{item.courseName}</Text> : null}
              </View>
              <Badge label={item.type || 'TASK'} variant="info" />
            </View>

            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

            <View style={styles.footer}>
              {item.dueDate ? (
                <View style={styles.dateRow}>
                  <Calendar size={13} color="#6B7280" />
                  <Text style={styles.dateText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
              ) : null}
              {item.maxPoints ? <Text style={styles.pts}>{item.maxPoints} pts</Text> : null}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#2C2727' },
  course: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  desc: { fontSize: 13, color: '#4B5563', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#6B7280' },
  pts: { fontSize: 12, fontWeight: '700', color: '#2C2727' },
});
