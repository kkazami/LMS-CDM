import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { Screen, AppHeader, ErrorBanner, SkeletonBlock } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useTheme } from '../../../src/hooks/useTheme';
import { studentNotificationRoute } from '../../../src/lib/student-navigation';
import { schoolDateKey, schoolTime } from '../../../src/lib/ics-calendar';

export default function AssignmentsScreen() {
  const theme = useTheme(), router = useRouter();
  const user = useAuthStore(s => s.user), api = useAuthStore(s => s.api);
  const [filter, setFilter] = useState('All');
  const query = useQuery({ queryKey: ['ics-dashboard', user?.id, user?.institute.code], queryFn: () => api.mobileDashboard.get(), staleTime: 20000 });
  const items = (query.data?.pendingAssignments || []).filter(event => filter === 'All' || (filter === 'Overdue' ? Date.parse(event.eventDate) < Date.now() : Date.parse(event.eventDate) >= Date.now())).sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
  return <Screen><AppHeader title="Assignments" subtitle="Pending coursework and deadlines" showBack />
    <View style={styles.filters}>{['All', 'Overdue', 'Upcoming'].map(label => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: label === filter }} onPress={() => setFilter(label)} style={[styles.filter, { backgroundColor: label === filter ? theme.colors.text : theme.colors.card, borderColor: theme.colors.border }]}><Text style={{ color: label === filter ? theme.colors.card : theme.colors.text }}>{label}</Text></Pressable>)}</View>
    {query.isError && <ErrorBanner message="Assignments could not refresh. Check your connection and retry." onRetry={() => { void query.refetch(); }} />}
    {query.isPending ? <View style={styles.list}><SkeletonBlock width="100%" height={100} /></View> : <FlatList data={items} keyExtractor={item => item.id} refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} contentContainerStyle={styles.list}
      ListEmptyComponent={!query.isError ? <Text style={{ color: theme.colors.textSecondary, fontSize: 15, lineHeight: 24 }}>No {filter === 'All' ? 'pending' : filter.toLowerCase()} assignments. You’re all caught up.</Text> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open assignment ${item.title}`} style={[styles.item, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => { const target = studentNotificationRoute(item.deepLink, 'ics'); if (target) router.push(target as never); }}>
        <View style={{ flex: 1, gap: 6 }}><Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{item.courseCode} · {item.courseTitle}</Text><Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{item.title}</Text><Text style={{ color: Date.parse(item.eventDate) < Date.now() ? theme.colors.danger : theme.colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{Date.parse(item.eventDate) < Date.now() ? 'Overdue · ' : 'Due · '}{schoolDateKey(item.eventDate)} · {schoolTime(item.eventDate)} GMT+8</Text></View><ChevronRight size={20} color={theme.colors.textSecondary} />
      </Pressable>} />}
  </Screen>;
}
const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, padding: 16 },
  filter: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  item: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
