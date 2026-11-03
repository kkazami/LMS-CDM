import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FlaskConical } from 'lucide-react-native';
import { Screen, AppHeader } from '../components/ui';
import { Button } from '../components/common/Button';
import { PressScale } from '../components/motion/PressScale';
import { useAuthStore } from '../stores/auth-store';
import { useTheme } from '../hooks/useTheme';
import { isIcsUser } from '../lib/ite-eligibility';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PracticalLabsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const api = useAuthStore(s => s.api);
  const user = useAuthStore(s => s.user);
  const role = user?.role === 'STUDENT' ? 'student' : 'teacher';
  const eligible = isIcsUser(user);
  const courses = useQuery({ queryKey: ['practical-lab-courses', user?.id], queryFn: () => api.courses.list('ics'), enabled: eligible });
  const items = (courses.data?.courses || []).filter(course => !course.isArchived);
  return <Screen>
    <AppHeader title="Practical Labs" subtitle="Guided practice for your ICS courses" showBack />
    {!eligible ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Practical Labs are available to ICS students and faculty.</Text>
      : courses.isPending ? <View style={styles.center}><ActivityIndicator color={theme.colors.primary} accessibilityLabel="Loading courses" /></View>
      : courses.isError ? <View style={styles.center}><Text style={{ color: theme.colors.text }}>Your courses could not be loaded.</Text><Button title="Try again" onPress={() => { void courses.refetch(); }} /></View>
      : <FlatList data={items} keyExtractor={course => course.id} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={courses.isRefetching} onRefresh={() => { void courses.refetch(); }} tintColor={theme.colors.primary} />}
        ListHeaderComponent={<Text style={[styles.description, { color: theme.colors.textSecondary }]}>Choose a course to {role === 'student' ? 'continue a lab, upload evidence, or review feedback' : 'assign labs and review student work'}.</Text>}
        ListEmptyComponent={<Text style={[styles.description, { color: theme.colors.textSecondary }]}>No active courses yet. Your labs will appear here after enrollment.</Text>}
        renderItem={({ item }) => <PressScale accessibilityLabel={`Open practical labs for ${item.title}`} onPress={() => router.push({ pathname: `/${role}/practical-labs`, params: { courseId: item.id } })}
          style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <FlaskConical color={theme.colors.primary} size={24} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.code, { color: theme.colors.textSecondary }]}>{item.code}{item.section ? ` · ${item.section}` : ''}</Text><Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text><Text style={[styles.code, { color: theme.colors.textSecondary }]}>View practical labs</Text></View>
          <ChevronRight color={theme.colors.textSecondary} size={20} />
        </PressScale>}
      />}
  </Screen>;
}
const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 12, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderWidth: 1, borderRadius: 16, minHeight: 96 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '700', marginVertical: 4 }, code: { fontSize: 13, lineHeight: 20 },
});
