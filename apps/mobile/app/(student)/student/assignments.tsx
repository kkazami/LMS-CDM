import { Text } from '../../../src/components/ui/Text';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { Screen, AppHeader, ErrorBanner, SkeletonBlock } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useTheme } from '../../../src/hooks/useTheme';
import { studentNotificationRoute } from '../../../src/lib/student-navigation';
import { schoolDateKey, schoolTime } from '../../../src/lib/ics-calendar';

export default function AssignmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const api = useAuthStore(s => s.api);
  const [filter, setFilter] = useState('All');

  const institute = (user?.institute?.code || 'ics').toLowerCase();
  const isIcs = institute === 'ics';

  const query = useQuery({
    queryKey: ['assignments-screen', user?.id, institute],
    staleTime: 20000,
    queryFn: async () => {
      if (isIcs) {
        return api.mobileDashboard.get();
      }
      // For IBE / other institutes, construct assignments from workspace tasks & courses
      const [tasksRes, coursesRes] = await Promise.allSettled([
        api.workspace.getTasks(institute),
        api.courses.list(institute),
      ]);
      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value?.tasks || [] : [];
      const courses = coursesRes.status === 'fulfilled' ? coursesRes.value?.courses || [] : [];
      const courseMap = new Map(courses.map(c => [c.id, c]));

      const pendingAssignments = tasks
        .filter(t => !t.completed && t.dueDate)
        .map(t => {
          const course = t.courseId ? courseMap.get(t.courseId) : null;
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            eventDate: t.dueDate!,
            eventType: 'assignment' as const,
            courseId: t.courseId || '',
            courseTitle: course?.title || 'Academic Task',
            courseCode: course?.code || '',
            deepLink: t.courseId ? `/${institute}/courses/${t.courseId}/classwork` : '',
            source: 'classwork' as const,
            maxPoints: null,
            professorName: '',
            creatorId: user?.id || '',
            instituteId: user?.instituteId || '',
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          };
        });

      const now = Date.now();
      const nextWeek = now + 7 * 86400000;

      return {
        courses: [],
        calendar: { events: [], schedules: [] },
        pendingAssignments,
        overdue: pendingAssignments.filter(event => Date.parse(event.eventDate) < now).length,
        dueSoon: pendingAssignments.filter(event => Date.parse(event.eventDate) >= now && Date.parse(event.eventDate) <= nextWeek).length,
      };
    },
    staleTime: 20000,
  });

  const items = (query.data?.pendingAssignments || [])
    .filter(event => filter === 'All' || (filter === 'Overdue' ? Date.parse(event.eventDate) < Date.now() : Date.parse(event.eventDate) >= Date.now()))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const handleItemPress = (item: any) => {
    if (isIcs && item.deepLink) {
      const target = studentNotificationRoute(item.deepLink, 'ics');
      if (target) {
        router.push(target as never);
        return;
      }
    }
    if (item.courseId) {
      router.push(`/student/courses/${item.courseId}` as never);
    } else {
      router.push('/student/tasks' as never);
    }
  };

  return (
    <Screen>
      <AppHeader title="Assignments" subtitle="Pending coursework and deadlines" showBack />
      <View style={styles.responsiveContainer}>
        <View style={styles.filters}>
          {['All', 'Overdue', 'Upcoming'].map(label => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: label === filter }}
              onPress={() => setFilter(label)}
              style={[
                styles.filter,
                {
                  backgroundColor: label === filter ? theme.colors.text : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={{ color: label === filter ? theme.colors.card : theme.colors.text, fontWeight: '600' }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {query.isError && (
          <ErrorBanner
            message="Assignments could not refresh. Check your connection and retry."
            onRetry={() => { void query.refetch(); }}
          />
        )}

        {query.isPending ? (
          <View style={styles.list}>
            <SkeletonBlock width="100%" height={100} />
            <SkeletonBlock width="100%" height={100} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            refreshing={query.isRefetching}
            onRefresh={() => { void query.refetch(); }}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !query.isError ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 32 }}>
                  No {filter === 'All' ? 'pending' : filter.toLowerCase()} assignments. You’re all caught up.
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open assignment ${item.title}`}
                style={[styles.item, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => handleItemPress(item)}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  {!!item.courseTitle && (
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' }}>
                      {item.courseCode ? `${item.courseCode} · ` : ''}{item.courseTitle}
                    </Text>
                  )}
                  <Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: Date.parse(item.eventDate) < Date.now() ? theme.colors.danger : theme.colors.textSecondary,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {Date.parse(item.eventDate) < Date.now() ? 'Overdue · ' : 'Due · '}
                    {schoolDateKey(item.eventDate)} · {schoolTime(item.eventDate)} GMT+8
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filter: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  item: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
